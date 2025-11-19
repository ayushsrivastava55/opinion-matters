use crate::constants::*;
use crate::error::MarketError;
use crate::state::*;
use crate::{AttestationSubmitted, ResolveMarketCallback, SubmitAttestation};
use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount; // Import from crate root

// Handler function - account struct is defined in lib.rs for #[arcium_program] macro

pub fn handler(
    ctx: Context<SubmitAttestation>,
    computation_offset: u64,
    attestation: [u8; 32],
) -> Result<()> {
    let clock = Clock::get()?;

    // Get keys and data before mutable borrows
    let market_key = ctx.accounts.market.key();
    let resolver_quorum = ctx.accounts.market.resolver_quorum;
    let resolver_key = ctx.accounts.resolver.key();
    let resolver_count = ctx.accounts.resolver.count;

    let market = &mut ctx.accounts.market;
    let resolver = &mut ctx.accounts.resolver;

    // Check market has ended
    require!(
        clock.unix_timestamp >= market.end_time,
        MarketError::MarketNotEnded
    );

    // Update market state to awaiting attestation if needed
    if market.resolution_state == ResolutionState::Active {
        market.resolution_state = ResolutionState::AwaitingAttestation;
    }

    let first_attestation = !resolver.has_attested;

    // Store attestation commitment
    resolver.attestation_commitment = attestation;
    resolver.has_attested = true;
    resolver.attestation_timestamp = clock.unix_timestamp;

    // Check if we have enough attestations to trigger resolution
    if resolver.count + 1 >= resolver_quorum {
        // Drop mutable borrows before calling queue_computation
        drop(market);
        drop(resolver);

        // Queue the resolution computation to Arcium
        let args = vec![
            Argument::EncryptedU32(attestation),
            // Read current market state
            Argument::Account(market_key, MARKET_YES_RESERVES_OFFSET, 8),
            Argument::Account(market_key, MARKET_NO_RESERVES_OFFSET, 8),
        ];

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![ResolveMarketCallback::callback_ix(&[CallbackAccount {
                pubkey: market_key,
                is_writable: true,
            }])],
            1,
        )?;

        msg!(
            "Market resolution queued to Arcium MPC for market {}",
            market_key
        );
    }

    emit!(AttestationSubmitted {
        market: market_key,
        resolver: resolver_key,
        timestamp: clock.unix_timestamp,
        count: resolver_count,
        quorum: resolver_quorum,
    });

    Ok(())
}
