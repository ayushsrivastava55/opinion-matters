use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

use crate::constants::MARKET_SEED;
use crate::error::MarketError;
use crate::state::*;

#[derive(Accounts)]
pub struct MintOutcomeTokens<'info> {
    #[account(
        mut,
        has_one = authority @ MarketError::Unauthorized,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        constraint = outcome_mint.key() == market.yes_mint || outcome_mint.key() == market.no_mint
            @ MarketError::Unauthorized,
    )]
    pub outcome_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = recipient_token_account.mint == outcome_mint.key() @ MarketError::Unauthorized,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<MintOutcomeTokens>, amount: u64) -> Result<()> {
    require!(amount > 0, MarketError::InsufficientCollateral);

    let market = &ctx.accounts.market;

    let seeds = &[MARKET_SEED, market.authority.as_ref(), &[market.bump]];
    let signer = &[&seeds[..]];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.outcome_mint.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: ctx.accounts.market.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::mint_to(cpi_ctx, amount)?;

    Ok(())
}
