use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use anchor_spl::token::spl_token;
use anchor_lang::solana_program::program_pack::Pack;
use crate::constants::*;
use crate::error::MarketError;
use crate::state::*;
use crate::CreateMarket; // Import account struct from crate root

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

    market.authority = ctx.accounts.authority.key();
    market.collateral_vault = ctx.accounts.collateral_vault.key();
    market.fee_vault = ctx.accounts.fee_vault.key();
    market.yes_mint = ctx.accounts.yes_mint.key();
    market.no_mint = ctx.accounts.no_mint.key();
    market.collateral_mint = ctx.accounts.collateral_mint.key();
    market.question = question;
    market.end_time = end_time;
    market.fee_bps = fee_bps;
    market.batch_interval = batch_interval;
    market.resolver_quorum = resolver_quorum;
    market.resolution_state = ResolutionState::Active;
    market.yes_reserves = 0;
    market.no_reserves = 0;
    market.total_liquidity = 0;
    market.next_batch_clear = clock.unix_timestamp + batch_interval;
    market.batch_order_count = 0;
    market.resolver_count = 0;
    market.cfmm_state_commitment = [0; 32];
    market.authority_bump = ctx.bumps.market;
    market.bump = ctx.bumps.market;
    market.final_outcome = None;

    msg!("Market created: {}", market.key());
    Ok(())
}
