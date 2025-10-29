use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};
use crate::error::MarketError;
use crate::state::*;

#[derive(Accounts)]
pub struct RedeemTokens<'info> {
    #[account(
        constraint = market.resolution_state == ResolutionState::Resolved @ MarketError::MarketNotResolved
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        constraint = outcome_mint.key() == market.yes_mint || outcome_mint.key() == market.no_mint
            @ MarketError::Unauthorized
    )]
    pub outcome_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = user_outcome_tokens.mint == outcome_mint.key() @ MarketError::Unauthorized,
        constraint = user_outcome_tokens.owner == user.key() @ MarketError::Unauthorized
    )]
    pub user_outcome_tokens: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = collateral_vault.key() == market.collateral_vault @ MarketError::Unauthorized
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_collateral_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<RedeemTokens>, amount: u64) -> Result<()> {
    let market = &ctx.accounts.market;

    require!(amount > 0, MarketError::InsufficientCollateral);

    // Determine if user holds winning tokens
    let is_yes_mint = ctx.accounts.outcome_mint.key() == market.yes_mint;
    let is_winning = if is_yes_mint {
        market.final_outcome == 1
    } else {
        market.final_outcome == 0
    };

    // Only winning tokens can be redeemed for collateral
    require!(is_winning, MarketError::InvalidOutcome);

    // Burn outcome tokens
    let cpi_accounts = Burn {
        mint: ctx.accounts.outcome_mint.to_account_info(),
        from: ctx.accounts.user_outcome_tokens.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::burn(cpi_ctx, amount)?;

    // Transfer collateral from vault to user (1:1 ratio)
    let market_key = market.key();
    let seeds = &[
        b"vault".as_ref(),
        market_key.as_ref(),
        &[market.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.collateral_vault.to_account_info(),
        to: ctx.accounts.user_collateral_account.to_account_info(),
        authority: ctx.accounts.collateral_vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::transfer(cpi_ctx, amount)?;

    let outcome_str = if is_yes_mint { "YES" } else { "NO" };
    msg!(
        "Redeemed {} {} tokens for {} collateral",
        amount,
        outcome_str,
        amount
    );

    Ok(())
}
