use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use crate::constants::MARKET_SEED;
use crate::error::MarketError;
use crate::state::*;
use crate::MintOutcomeTokens; // Import account struct from crate root

pub fn handler(ctx: Context<MintOutcomeTokens>, amount: u64) -> Result<()> {
    require!(amount > 0, MarketError::InsufficientCollateral);

    let market = &ctx.accounts.market;
    let authority_bump = market.authority_bump;
    let authority_key = market.authority.key();
    
    let seeds = &[
        MARKET_SEED,
        authority_key.as_ref(),
        &[authority_bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.outcome_mint.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::mint_to(cpi_ctx, amount)?;

    msg!("Minted {} outcome tokens", amount);
    Ok(())
}
