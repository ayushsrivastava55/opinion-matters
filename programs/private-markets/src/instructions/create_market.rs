use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::constants::*;
use crate::error::MarketError;
use crate::state::*;

#[derive(Accounts)]
#[instruction(question: String)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = Market::LEN,
        seeds = [MARKET_SEED, authority.key().as_ref()],
        bump
    )]
    pub market: Box<Account<'info, Market>>,

    #[account(
        init,
        payer = authority,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump,
        token::mint = collateral_mint,
        token::authority = market,
    )]
    pub collateral_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        seeds = [FEE_VAULT_SEED, market.key().as_ref()],
        bump,
        token::mint = collateral_mint,
        token::authority = market,
    )]
    pub fee_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        seeds = [YES_MINT_SEED, market.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = market,
    )]
    pub yes_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = authority,
        seeds = [NO_MINT_SEED, market.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = market,
    )]
    pub no_mint: Box<Account<'info, Mint>>,

    pub collateral_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    question: String,
    end_time: i64,
    fee_bps: u16,
    batch_interval: i64,
    resolver_quorum: u8,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Validate inputs
    require!(
        question.len() <= MAX_QUESTION_LEN,
        MarketError::QuestionTooLong
    );
    require!(
        end_time > clock.unix_timestamp,
        MarketError::InvalidEndTime
    );
    require!(
        fee_bps >= MIN_FEE_BPS && fee_bps <= MAX_FEE_BPS,
        MarketError::InvalidFeeBps
    );
    require!(
        batch_interval >= MIN_BATCH_INTERVAL && batch_interval <= MAX_BATCH_INTERVAL,
        MarketError::InvalidBatchInterval
    );
    require!(
        resolver_quorum >= MIN_QUORUM && resolver_quorum <= MAX_RESOLVERS as u8,
        MarketError::InvalidQuorum
    );

    // Initialize market state
    market.authority = ctx.accounts.authority.key();
    market.question = question;
    market.end_time = end_time;
    market.fee_bps = fee_bps;
    market.batch_interval = batch_interval;
    market.next_batch_clear = clock.unix_timestamp + batch_interval;
    market.resolver_quorum = resolver_quorum;
    market.resolver_count = 0;
    market.attestation_count = 0;
    market.collateral_vault = ctx.accounts.collateral_vault.key();
    market.fee_vault = ctx.accounts.fee_vault.key();
    market.yes_mint = ctx.accounts.yes_mint.key();
    market.no_mint = ctx.accounts.no_mint.key();
    
    // Initialize CFMM with equal reserves (commitment will be updated by Arcium)
    market.cfmm_state_commitment = [0u8; 32];
    market.yes_reserves = INITIAL_RESERVES;
    market.no_reserves = INITIAL_RESERVES;
    market.total_volume = 0;
    
    market.batch_order_root = [0u8; 32];
    market.batch_order_count = 0;
    market.resolution_state = ResolutionState::Active;
    market.final_outcome = 255; // Unresolved
    market.bump = ctx.bumps.market;

    msg!("Market created: {}", market.key());
    msg!("Question: {}", market.question);
    msg!("End time: {}", market.end_time);

    Ok(())
}
