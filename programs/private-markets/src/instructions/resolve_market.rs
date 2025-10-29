use anchor_lang::prelude::*;
use crate::error::MarketError;
use crate::state::*;

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        constraint = market.resolution_state == ResolutionState::Computing @ MarketError::MarketNotResolved
    )]
    pub market: Account<'info, Market>,

    /// Arcium MPC authority (in production, verify signature)
    pub arcium_authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<ResolveMarket>,
    final_outcome: u8,
    resolution_proof: Vec<u8>,
) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // Validate outcome (0 = NO, 1 = YES)
    require!(
        final_outcome == 0 || final_outcome == 1,
        MarketError::InvalidOutcome
    );

    // TODO: In production, verify Arcium MPC resolution proof
    // This would include:
    // - Threshold signature from MPC nodes
    // - Proof that resolution aggregation was correct
    // - Individual resolver attestation proofs
    // - Slashing evidence for misaligned resolvers

    // Validate resolution proof exists
    require!(
        !resolution_proof.is_empty(),
        MarketError::InvalidAttestation
    );

    // Update market with final outcome
    market.final_outcome = final_outcome;
    market.resolution_state = ResolutionState::Resolved;

    let outcome_str = if final_outcome == 1 { "YES" } else { "NO" };
    msg!("Market {} resolved to {}", market.key(), outcome_str);
    msg!("Resolution proof length: {}", resolution_proof.len());

    emit!(MarketResolved {
        market: market.key(),
        final_outcome,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub final_outcome: u8,
    pub timestamp: i64,
}
