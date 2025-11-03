use anchor_lang::prelude::*;
use crate::error::MarketError;
use crate::state::*;
use crate::{ResolveMarket, MarketResolved}; // Import account struct and event from crate root

pub fn handler(
    ctx: Context<ResolveMarket>,
    final_outcome: u8,
    resolution_proof: Vec<u8>,
) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(
        market.resolution_state == ResolutionState::Computing,
        MarketError::MarketNotResolved
    );

    // Store resolution result
    market.resolution_state = ResolutionState::Resolved;
    market.final_outcome = Some(final_outcome);

    msg!(
        "Market {} resolved with outcome: {}",
        market.key(),
        final_outcome
    );

    emit!(MarketResolved {
        market: market.key(),
        outcome: final_outcome,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
