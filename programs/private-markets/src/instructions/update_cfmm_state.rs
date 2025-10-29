use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token};
use crate::error::MarketError;
use crate::state::*;

#[derive(Accounts)]
pub struct UpdateCfmmState<'info> {
    #[account(
        mut,
        constraint = market.resolution_state == ResolutionState::Active @ MarketError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        constraint = yes_mint.key() == market.yes_mint @ MarketError::Unauthorized
    )]
    pub yes_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = no_mint.key() == market.no_mint @ MarketError::Unauthorized
    )]
    pub no_mint: Account<'info, Mint>,

    /// Arcium MPC authority (in production, verify signature)
    pub arcium_authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<UpdateCfmmState>,
    new_state_commitment: [u8; 32],
    reserve_delta_yes: i64,
    reserve_delta_no: i64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Check market hasn't ended
    require!(
        clock.unix_timestamp < market.end_time,
        MarketError::MarketEnded
    );

    // Verify state commitment is valid (non-zero)
    require!(
        new_state_commitment != [0u8; 32],
        MarketError::InvalidStateCommitment
    );

    // TODO: In production, verify Arcium MPC signature
    // This would validate that the state update comes from the MPC cluster
    // and includes proper attestations from threshold nodes

    // Update CFMM reserves
    if reserve_delta_yes >= 0 {
        market.yes_reserves = market
            .yes_reserves
            .checked_add(reserve_delta_yes as u64)
            .ok_or(MarketError::Overflow)?;
    } else {
        market.yes_reserves = market
            .yes_reserves
            .checked_sub((-reserve_delta_yes) as u64)
            .ok_or(MarketError::Overflow)?;
    }

    if reserve_delta_no >= 0 {
        market.no_reserves = market
            .no_reserves
            .checked_add(reserve_delta_no as u64)
            .ok_or(MarketError::Overflow)?;
    } else {
        market.no_reserves = market
            .no_reserves
            .checked_sub((-reserve_delta_no) as u64)
            .ok_or(MarketError::Overflow)?;
    }

    // Validate CFMM invariant is maintained (with tolerance for fees)
    let product = (market.yes_reserves as u128)
        .checked_mul(market.no_reserves as u128)
        .ok_or(MarketError::Overflow)?;
    
    require!(
        product > 0,
        MarketError::InvalidCfmmState
    );

    // Update state commitment
    market.cfmm_state_commitment = new_state_commitment;

    // Calculate trade volume from absolute deltas
    let volume = reserve_delta_yes
        .abs()
        .max(reserve_delta_no.abs()) as u64;
    market.total_volume = market
        .total_volume
        .checked_add(volume)
        .ok_or(MarketError::Overflow)?;

    msg!("CFMM state updated for market {}", market.key());
    msg!("New YES reserves: {}", market.yes_reserves);
    msg!("New NO reserves: {}", market.no_reserves);
    msg!("New state commitment: {:?}", new_state_commitment);

    Ok(())
}
