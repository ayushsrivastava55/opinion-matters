use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::MarketError;
use crate::state::*;
use crate::StakeResolver; // Import account struct from crate root

pub fn handler(ctx: Context<StakeResolver>, amount: u64) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let resolver = &mut ctx.accounts.resolver;

    require!(amount >= MIN_RESOLVER_STAKE, MarketError::InsufficientStake);

    // Transfer stake from resolver to collateral vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.resolver_token_account.to_account_info(),
        to: ctx.accounts.collateral_vault.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Initialize resolver
    resolver.market = market.key();
    resolver.authority = ctx.accounts.authority.key();
    resolver.stake = amount;
    resolver.has_attested = false;
    resolver.attestation_commitment = [0; 32];
    resolver.count = 0;
    resolver.bump = ctx.bumps.resolver;

    market.resolver_count = market.resolver_count.checked_add(1).unwrap();

    msg!("Resolver staked {} tokens", amount);
    Ok(())
}
