use anchor_lang::prelude::*;
use crate::error::MarketError;
use crate::state::*;
use crate::{ApplyBatchClear, BatchCleared}; // Import account struct and event from crate root

pub fn handler(
    ctx: Context<ApplyBatchClear>,
    new_state_commitment: [u8; 32],
    uniform_price: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(
        market.resolution_state == ResolutionState::Active,
        MarketError::MarketAlreadyResolved
    );

    // Update CFMM state commitment
    market.cfmm_state_commitment = new_state_commitment;

    // Reset batch counter and update next batch time
    let clock = Clock::get()?;
    market.batch_order_count = 0;
    market.next_batch_clear = clock.unix_timestamp + market.batch_interval;

    msg!(
        "Batch cleared for market {} with uniform price: {}",
        market.key(),
        uniform_price
    );

    emit!(BatchCleared {
        market: market.key(),
        uniform_price,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
