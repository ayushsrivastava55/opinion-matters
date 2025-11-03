use crate::constants::MARKET_SEED;
use crate::error::MarketError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};
use crate::RedeemTokens; // Import account struct from crate root

pub fn handler(ctx: Context<RedeemTokens>, amount: u64) -> Result<()> {
    let market = &ctx.accounts.market;

    require!(amount > 0, MarketError::InsufficientCollateral);
    require!(
        market.resolution_state == ResolutionState::Resolved,
        MarketError::MarketNotResolved
    );

    // Burn outcome tokens
    let cpi_accounts_burn = Burn {
        mint: ctx.accounts.outcome_mint.to_account_info(),
        from: ctx.accounts.user_outcome_tokens.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program.clone(), cpi_accounts_burn);
    token::burn(cpi_ctx, amount)?;

    // Transfer collateral to user (simplified - should calculate payout based on winning outcome)
    let authority_bump = market.authority_bump;
    let authority_key = market.authority.key();
    let seeds = &[
        MARKET_SEED,
        authority_key.as_ref(),
        &[authority_bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts_transfer = Transfer {
        from: ctx.accounts.collateral_vault.to_account_info(),
        to: ctx.accounts.user_collateral_account.to_account_info(),
        authority: market.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts_transfer, signer);
    token::transfer(cpi_ctx, amount)?;

    msg!("Redeemed {} outcome tokens for collateral", amount);
    Ok(())
}
