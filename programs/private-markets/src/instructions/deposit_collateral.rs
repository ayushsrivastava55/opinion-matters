use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};
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

    #[account(mut)]
    pub user_yes_tokens: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_no_tokens: Account<'info, TokenAccount>,

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

    // Mint outcome pair (YES and NO) 1:1 to the user using market PDA as mint authority
    let market_key = market.key();
    let seeds = &[b"market".as_ref(), market.authority.as_ref(), &[market.bump]];
    let signer = &[&seeds[..]];

    // YES mint
    let cpi_accounts_yes = MintTo {
        mint: ctx.accounts.yes_mint.to_account_info(),
        to: ctx.accounts.user_yes_tokens.to_account_info(),
        authority: market.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx_yes = CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts_yes, signer);
    token::mint_to(cpi_ctx_yes, amount)?;

    // NO mint
    let cpi_accounts_no = MintTo {
        mint: ctx.accounts.no_mint.to_account_info(),
        to: ctx.accounts.user_no_tokens.to_account_info(),
        authority: market.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx_no = CpiContext::new_with_signer(cpi_program, cpi_accounts_no, signer);
    token::mint_to(cpi_ctx_no, amount)?;

    msg!("Deposited {} collateral to market {}", amount, market.key());
    msg!("Minted {} YES and {} NO tokens", amount, amount);

    Ok(())
}
