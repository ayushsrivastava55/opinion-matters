use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use anchor_spl::token::spl_token;
use anchor_lang::solana_program::program_pack::Pack;
use crate::constants::*;
use crate::error::MarketError;
use crate::state::*;

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = Market::LEN,
        seeds = [MARKET_SEED, authority.key().as_ref()],
        bump
    )]
    pub market: Box<Account<'info, Market>>,

    /// CHECK: created via CPI; verified against PDA inside handler
    #[account(mut)]
    pub collateral_vault: UncheckedAccount<'info>,
    /// CHECK: created via CPI; verified against PDA inside handler
    #[account(mut)]
    pub fee_vault: UncheckedAccount<'info>,
    /// CHECK: created via CPI; verified against PDA inside handler
    #[account(mut)]
    pub yes_mint: UncheckedAccount<'info>,
    /// CHECK: created via CPI; verified against PDA inside handler
    #[account(mut)]
    pub no_mint: UncheckedAccount<'info>,

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

    // Derive and verify all PDAs we expect to create via CPI
    let program_id = ctx.program_id;

    let (expected_collateral_vault, cv_bump) = Pubkey::find_program_address(
        &[VAULT_SEED, market.key().as_ref()],
        program_id,
    );
    require_keys_eq!(
        expected_collateral_vault,
        ctx.accounts.collateral_vault.key(),
        MarketError::Unauthorized
    );

    let (expected_fee_vault, fv_bump) = Pubkey::find_program_address(
        &[FEE_VAULT_SEED, market.key().as_ref()],
        program_id,
    );
    require_keys_eq!(
        expected_fee_vault,
        ctx.accounts.fee_vault.key(),
        MarketError::Unauthorized
    );

    let (expected_yes_mint, yes_bump) = Pubkey::find_program_address(
        &[YES_MINT_SEED, market.key().as_ref()],
        program_id,
    );
    require_keys_eq!(
        expected_yes_mint,
        ctx.accounts.yes_mint.key(),
        MarketError::Unauthorized
    );

    let (expected_no_mint, no_bump) = Pubkey::find_program_address(
        &[NO_MINT_SEED, market.key().as_ref()],
        program_id,
    );
    require_keys_eq!(
        expected_no_mint,
        ctx.accounts.no_mint.key(),
        MarketError::Unauthorized
    );

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

    // Create YES/NO mints via CPI
    let mint_lamports = Rent::get()?.minimum_balance(spl_token::state::Mint::LEN);
    // YES mint
    system_program::create_account(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::CreateAccount {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.yes_mint.to_account_info(),
            },
            &[&[YES_MINT_SEED, market.key().as_ref(), &[yes_bump]]],
        ),
        mint_lamports,
        spl_token::state::Mint::LEN as u64,
        &ctx.accounts.token_program.key(),
    )?;
    token::initialize_mint2(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::InitializeMint2 {
                mint: ctx.accounts.yes_mint.to_account_info(),
            },
        ),
        6,
        &market.key(),
        None,
    )?;

    // NO mint
    system_program::create_account(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::CreateAccount {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.no_mint.to_account_info(),
            },
            &[&[NO_MINT_SEED, market.key().as_ref(), &[no_bump]]],
        ),
        mint_lamports,
        spl_token::state::Mint::LEN as u64,
        &ctx.accounts.token_program.key(),
    )?;
    token::initialize_mint2(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::InitializeMint2 {
                mint: ctx.accounts.no_mint.to_account_info(),
            },
        ),
        6,
        &market.key(),
        None,
    )?;

    // Create collateral and fee vaults (Token Accounts) via CPI
    let acct_lamports = Rent::get()?.minimum_balance(spl_token::state::Account::LEN);
    // Collateral vault
    system_program::create_account(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::CreateAccount {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.collateral_vault.to_account_info(),
            },
            &[&[VAULT_SEED, market.key().as_ref(), &[cv_bump]]],
        ),
        acct_lamports,
        spl_token::state::Account::LEN as u64,
        &ctx.accounts.token_program.key(),
    )?;
    token::initialize_account3(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::InitializeAccount3 {
                account: ctx.accounts.collateral_vault.to_account_info(),
                mint: ctx.accounts.collateral_mint.to_account_info(),
                authority: market.to_account_info(),
            },
        ),
    )?;

    // Fee vault
    system_program::create_account(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::CreateAccount {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.fee_vault.to_account_info(),
            },
            &[&[FEE_VAULT_SEED, market.key().as_ref(), &[fv_bump]]],
        ),
        acct_lamports,
        spl_token::state::Account::LEN as u64,
        &ctx.accounts.token_program.key(),
    )?;
    token::initialize_account3(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::InitializeAccount3 {
                account: ctx.accounts.fee_vault.to_account_info(),
                mint: ctx.accounts.collateral_mint.to_account_info(),
                authority: market.to_account_info(),
            },
        ),
    )?;

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
