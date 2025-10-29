use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::MarketError;
use crate::state::*;

#[derive(Accounts)]
pub struct StakeResolver<'info> {
    #[account(
        mut,
        constraint = market.resolution_state == ResolutionState::Active @ MarketError::MarketAlreadyResolved,
        constraint = market.resolver_count < MAX_RESOLVERS as u8 @ MarketError::InsufficientResolvers
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = authority,
        space = Resolver::LEN,
        seeds = [RESOLVER_SEED, market.key().as_ref(), authority.key().as_ref()],
        bump
    )]
    pub resolver: Account<'info, Resolver>,

    #[account(
        mut,
        constraint = collateral_vault.key() == market.collateral_vault @ MarketError::Unauthorized
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub resolver_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<StakeResolver>, amount: u64) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let resolver = &mut ctx.accounts.resolver;
    let clock = Clock::get()?;

    // Check market hasn't ended
    require!(
        clock.unix_timestamp < market.end_time,
        MarketError::MarketEnded
    );

    require!(amount > 0, MarketError::InsufficientCollateral);

    // Transfer stake from resolver to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.resolver_token_account.to_account_info(),
        to: ctx.accounts.collateral_vault.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Initialize resolver account
    resolver.authority = ctx.accounts.authority.key();
    resolver.market = market.key();
    resolver.stake_amount = amount;
    resolver.has_attested = false;
    resolver.attestation_commitment = [0u8; 32];
    resolver.staked_at = clock.unix_timestamp;
    resolver.bump = ctx.bumps.resolver;

    // Increment resolver count
    market.resolver_count = market
        .resolver_count
        .checked_add(1)
        .ok_or(MarketError::Overflow)?;

    msg!(
        "Resolver {} staked {} for market {}",
        ctx.accounts.authority.key(),
        amount,
        market.key()
    );
    msg!("Total resolvers: {}/{}", market.resolver_count, market.resolver_quorum);

    Ok(())
}
