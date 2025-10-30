use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::MarketError;
use crate::state::*;

#[derive(Accounts)]
pub struct SubmitAttestation<'info> {
    #[account(
        mut,
        constraint = matches!(
            market.resolution_state,
            ResolutionState::Active | ResolutionState::AwaitingAttestation
        ) @ MarketError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [RESOLVER_SEED, market.key().as_ref(), authority.key().as_ref()],
        bump = resolver.bump,
        constraint = resolver.market == market.key() @ MarketError::Unauthorized,
        constraint = !resolver.has_attested @ MarketError::InvalidAttestation
    )]
    pub resolver: Account<'info, Resolver>,

    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<SubmitAttestation>,
    encrypted_attestation: Vec<u8>,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let resolver = &mut ctx.accounts.resolver;
    let clock = Clock::get()?;

    // Check market has ended
    require!(
        clock.unix_timestamp >= market.end_time,
        MarketError::MarketNotEnded
    );

    // Validate encrypted attestation
    require!(
        !encrypted_attestation.is_empty(),
        MarketError::InvalidAttestation
    );

    // Update market state to awaiting attestation if needed
    if market.resolution_state == ResolutionState::Active {
        market.resolution_state = ResolutionState::AwaitingAttestation;
    }

    // Store attestation commitment (hash of encrypted attestation)
    // In production, compute proper hash
    let mut attestation_commitment = [0u8; 32];
    let len = encrypted_attestation.len().min(32);
    attestation_commitment[..len].copy_from_slice(&encrypted_attestation[..len]);

    resolver.attestation_commitment = attestation_commitment;

    if !resolver.has_attested {
        market.attestation_count = market
            .attestation_count
            .checked_add(1)
            .ok_or(MarketError::Overflow)?;
    }

    resolver.has_attested = true;

    msg!(
        "Attestation submitted by resolver {} for market {}",
        ctx.accounts.authority.key(),
        market.key()
    );

    // Check if we have enough attestations to trigger MPC resolution
    let attested_count = market.attestation_count;
    if attested_count >= market.resolver_quorum {
        market.resolution_state = ResolutionState::Computing;
        msg!("Quorum reached. Market ready for MPC resolution.");

        emit!(ResolutionReady {
            market: market.key(),
            attestation_count: attested_count,
            quorum: market.resolver_quorum,
        });
    }

    Ok(())
}

#[event]
pub struct ResolutionReady {
    pub market: Pubkey,
    pub attestation_count: u8,
    pub quorum: u8,
}
