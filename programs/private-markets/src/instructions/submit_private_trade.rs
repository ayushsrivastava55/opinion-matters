use anchor_lang::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;
use arcium_anchor::prelude::*;
use crate::constants::*;
use crate::error::MarketError;
use crate::state::*;
use crate::{SubmitPrivateTrade, PrivateTradeCallback, PrivateTradeQueued}; // Import from crate root

// Handler function - account struct is defined in lib.rs for #[arcium_program] macro

pub fn handler(
    ctx: Context<SubmitPrivateTrade>,
    computation_offset: u64,
    encrypted_order: [u8; 32],
    client_pubkey: [u8; 32],
) -> Result<()> {
    let market = &ctx.accounts.market;
    let clock = Clock::get()?;

    // Check market hasn't ended
    require!(
        clock.unix_timestamp < market.end_time,
        MarketError::MarketEnded
    );

    // Build arguments for the encrypted instruction
    // Following blackjack pattern: use Argument::Account() to read on-chain data
    let args = vec![
        // User's public key (for re-encrypting results back to them)
        Argument::ArcisPubkey(client_pubkey),
        // Encrypted order data
        Argument::EncryptedU32(encrypted_order),
        // Read current CFMM state directly from market account
        Argument::Account(ctx.accounts.market.key(), MARKET_YES_RESERVES_OFFSET, 8),
        Argument::Account(ctx.accounts.market.key(), MARKET_NO_RESERVES_OFFSET, 8),
        Argument::Account(ctx.accounts.market.key(), MARKET_CFMM_COMMITMENT_OFFSET, 32),
    ];

    // Set the sign PDA bump (required by Arcium)
    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

    // Queue the computation to Arcium MPC cluster
    // This will:
    // 1. Submit encrypted inputs to Arcium
    // 2. MPC nodes collaboratively execute private_trade circuit
    // 3. Callback instruction will be invoked with results
    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        None,  // No additional callback accounts needed
        vec![PrivateTradeCallback::callback_ix(&[
            CallbackAccount {
                pubkey: ctx.accounts.market.key(),
                is_writable: true,
            }
        ])],  // Callback instruction with market account
    )?;

    msg!(
        "Private trade queued to Arcium MPC for market {} by user {}",
        market.key(),
        ctx.accounts.payer.key()
    );
    // Emit event for tracking
    emit!(PrivateTradeQueued {
        market: market.key(),
        user: ctx.accounts.payer.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
