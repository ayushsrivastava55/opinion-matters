use crate::constants::*;
use crate::error::MarketError;
use crate::state::*;
use crate::{BatchClearCallback, SubmitBatchOrder};
use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount; // Import from crate root

// Handler function - account struct is defined in lib.rs for #[arcium_program] macro

pub fn handler(
    ctx: Context<SubmitBatchOrder>,
    computation_offset: u64,
    batch_orders: Vec<BatchOrderData>,
) -> Result<()> {
    let clock = Clock::get()?;

    // Get key before mutable borrow
    let market_key = ctx.accounts.market.key();

    let market = &mut ctx.accounts.market;

    // Check market hasn't ended
    require!(
        clock.unix_timestamp < market.end_time,
        MarketError::MarketEnded
    );

    // Check we're within a batch window
    require!(
        clock.unix_timestamp < market.next_batch_clear,
        MarketError::BatchWindowOpen
    );

    // Increment batch order count
    market.batch_order_count = market
        .batch_order_count
        .checked_add(batch_orders.len() as u32)
        .ok_or(MarketError::Overflow)?;

    // Drop mutable borrow before calling queue_computation
    drop(market);

    // Build arguments for batch clearing computation
    let args = vec![
        // Read current CFMM state
        Argument::Account(market_key, MARKET_YES_RESERVES_OFFSET, 8),
        Argument::Account(market_key, MARKET_NO_RESERVES_OFFSET, 8),
    ];

    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

    // Queue batch clear computation
    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        None,
        vec![BatchClearCallback::callback_ix(&[CallbackAccount {
            pubkey: market_key,
            is_writable: true,
        }])],
        1,
    )?;

    msg!("Batch orders queued for market {}", market_key);

    Ok(())
}
