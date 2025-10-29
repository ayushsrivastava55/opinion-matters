use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::error::MarketError;
use crate::state::*;

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(
        constraint = market.resolution_state == ResolutionState::Active @ MarketError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        constraint = collateral_vault.key() == market.collateral_vault @ MarketError::Unauthorized
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_collateral.owner == user.key() @ MarketError::Unauthorized
    )]
    pub user_collateral: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
    let market = &ctx.accounts.market;
    let clock = Clock::get()?;

    // Check market hasn't ended
    require!(
        clock.unix_timestamp < market.end_time,
        MarketError::MarketEnded
    );

    require!(amount > 0, MarketError::InsufficientCollateral);

    // Transfer collateral from user to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_collateral.to_account_info(),
        to: ctx.accounts.collateral_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    msg!("Deposited {} collateral to market {}", amount, market.key());

    Ok(())
}
