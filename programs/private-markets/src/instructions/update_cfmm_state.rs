use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token};
use crate::error::MarketError;
use crate::state::*;
use crate::UpdateCfmmState; // Import account struct from crate root

pub fn handler(
    ctx: Context<UpdateCfmmState>,
    new_state_commitment: [u8; 32],
    reserve_delta_yes: i64,
    reserve_delta_no: i64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(
        market.resolution_state == ResolutionState::Active,
        MarketError::MarketAlreadyResolved
    );

    // Update CFMM state commitment
    market.cfmm_state_commitment = new_state_commitment;

    // Update reserves (add/subtract deltas)
    if reserve_delta_yes >= 0 {
        market.yes_reserves = market.yes_reserves.checked_add(reserve_delta_yes as u64).unwrap();
    } else {
        market.yes_reserves = market.yes_reserves.checked_sub((-reserve_delta_yes) as u64).unwrap();
    }

    if reserve_delta_no >= 0 {
        market.no_reserves = market.no_reserves.checked_add(reserve_delta_no as u64).unwrap();
    } else {
        market.no_reserves = market.no_reserves.checked_sub((-reserve_delta_no) as u64).unwrap();
    }

    msg!(
        "CFMM state updated for market {}. New reserves: YES={}, NO={}",
        market.key(),
        market.yes_reserves,
        market.no_reserves
    );

    Ok(())
}
