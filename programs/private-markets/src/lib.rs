use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

// Import error and state types for use in account structs
use error::MarketError;
use state::{BatchOrderData, Market, ResolutionState, Resolver};

// Import and re-export all instruction handlers
use instructions::*;

use constants::*;

// Computation definition offsets - must match Arcium.toml
const fn comp_def_offset(name: &str) -> u32 {
    // This is called by Arcium macros at compile time
    // The actual values come from Arcium.toml
    match name.as_bytes() {
        b"private_trade" => 1000,
        b"batch_clear" => 2000,
        b"resolve_market" => 3000,
        _ => 0,
    }
}

declare_id!("AjSL49GvLcfvarTXBcTX1fk9WqxH6LFVLpWnh8bgGtnK");

// Arcium macros expect an ErrorCode enum with ClusterNotSet at crate root
// This must be public and at crate level for derive_cluster_pda!() macro
#[error_code]
pub enum ErrorCode {
    #[msg("Cluster not set")]
    ClusterNotSet,
}

// Account structs must be at crate root for #[arcium_program] macro to find them
// These are re-exported from the instruction modules

#[queue_computation_accounts("private_trade", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct SubmitPrivateTrade<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_PRIVATE_TRADE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut)]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        mut,
        constraint = market.resolution_state == ResolutionState::Active @ MarketError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,
}

#[queue_computation_accounts("batch_clear", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct SubmitBatchOrder<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_BATCH_CLEAR)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut)]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        mut,
        constraint = market.resolution_state == ResolutionState::Active @ MarketError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,
}

#[queue_computation_accounts("resolve_market", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct SubmitAttestation<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_RESOLVE_MARKET)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut)]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        mut,
        constraint = matches!(
            market.resolution_state,
            ResolutionState::Active | ResolutionState::AwaitingAttestation
        ) @ MarketError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [RESOLVER_SEED, market.key().as_ref(), authority.key().as_ref()],
        bump = resolver.bump,
        constraint = resolver.market == market.key() @ MarketError::Unauthorized,
    )]
    pub resolver: Account<'info, Resolver>,
    pub authority: Signer<'info>,
}

// Callback structs must also be at crate root
#[callback_accounts("private_trade")]
#[derive(Accounts)]
pub struct PrivateTradeCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_PRIVATE_TRADE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
}

#[callback_accounts("batch_clear")]
#[derive(Accounts)]
pub struct BatchClearCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_BATCH_CLEAR)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
}

#[callback_accounts("resolve_market")]
#[derive(Accounts)]
pub struct ResolveMarketCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_RESOLVE_MARKET)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
}

// Non-Arcium account structs (regular Anchor instructions)
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
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

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

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        constraint = market.resolution_state == ResolutionState::Computing @ MarketError::MarketNotResolved
    )]
    pub market: Account<'info, Market>,
    /// Arcium MPC authority (in production, verify signature)
    pub arcium_authority: Signer<'info>,
}

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

#[derive(Accounts)]
pub struct ApplyBatchClear<'info> {
    #[account(
        mut,
        constraint = market.resolution_state == ResolutionState::Active @ MarketError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,
    /// Arcium MPC authority (in production, verify signature)
    pub arcium_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateCfmmState<'info> {
    #[account(
        mut,
        constraint = market.resolution_state == ResolutionState::Active @ MarketError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,
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
    /// Arcium MPC authority (in production, verify signature)
    pub arcium_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[arcium_program]
pub mod private_markets {
    use super::*;

    pub fn init_private_trade_comp_def(ctx: Context<InitPrivateTradeCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_batch_clear_comp_def(ctx: Context<InitBatchClearCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_resolve_market_comp_def(ctx: Context<InitResolveMarketCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    // Forward to instruction handlers
    pub fn create_market(
        ctx: Context<CreateMarket>,
        question: String,
        end_time: i64,
        fee_bps: u16,
        batch_interval: i64,
        resolver_quorum: u8,
    ) -> Result<()> {
        create_market_handler(
            ctx,
            question,
            end_time,
            fee_bps,
            batch_interval,
            resolver_quorum,
        )
    }

    pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
        deposit_collateral_handler(ctx, amount)
    }

    pub fn mint_outcome_tokens(ctx: Context<MintOutcomeTokens>, amount: u64) -> Result<()> {
        mint_outcome_tokens_handler(ctx, amount)
    }

    pub fn redeem_tokens(ctx: Context<RedeemTokens>, amount: u64) -> Result<()> {
        redeem_tokens_handler(ctx, amount)
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        final_outcome: u8,
        resolution_proof: Vec<u8>,
    ) -> Result<()> {
        resolve_market_handler(ctx, final_outcome, resolution_proof)
    }

    pub fn stake_resolver(ctx: Context<StakeResolver>, amount: u64) -> Result<()> {
        stake_resolver_handler(ctx, amount)
    }

    #[arcium_callback(encrypted_ix = "private_trade")]
    pub fn private_trade_callback(
        ctx: Context<PrivateTradeCallback>,
        output: ComputationOutputs<PrivateTradeOutput>,
    ) -> Result<()> {
        let cfmm_state = match output {
            ComputationOutputs::Success(PrivateTradeOutput { field_0 }) => field_0,
            _ => return Err(MarketError::ComputationFailed.into()),
        };

        let market = &mut ctx.accounts.market;
        msg!(
            "Private trade executed successfully for market {}",
            market.key()
        );

        emit!(PrivateTradeExecuted {
            market: market.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "batch_clear")]
    pub fn batch_clear_callback(
        ctx: Context<BatchClearCallback>,
        output: ComputationOutputs<BatchClearOutput>,
    ) -> Result<()> {
        let batch_result = match output {
            ComputationOutputs::Success(BatchClearOutput { field_0 }) => field_0,
            _ => return Err(MarketError::ComputationFailed.into()),
        };

        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        market.next_batch_clear = clock.unix_timestamp + market.batch_interval;
        market.batch_order_count = 0;

        msg!("Batch cleared for market {}", market.key());

        emit!(BatchCleared {
            market: market.key(),
            uniform_price: 0, // Placeholder - actual price computed in MPC
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "resolve_market")]
    pub fn resolve_market_callback(
        ctx: Context<ResolveMarketCallback>,
        output: ComputationOutputs<ResolveMarketOutput>,
    ) -> Result<()> {
        let _resolution_result = match output {
            ComputationOutputs::Success(ResolveMarketOutput { field_0 }) => field_0,
            _ => return Err(MarketError::ComputationFailed.into()),
        };

        let market = &mut ctx.accounts.market;
        market.resolution_state = ResolutionState::Resolved;
        // Note: actual outcome is encrypted in MPC, would need decryption to get real value
        market.final_outcome = Some(0); // Placeholder - actual outcome stored encrypted

        let clock = Clock::get()?;

        msg!("Market {} resolved via Arcium MPC", market.key());

        emit!(MarketResolved {
            market: market.key(),
            outcome: 0, // Placeholder - actual outcome is encrypted
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Apply batch clear results from Arcium MPC
    pub fn apply_batch_clear(
        ctx: Context<ApplyBatchClear>,
        new_state_commitment: [u8; 32],
        uniform_price: u64,
    ) -> Result<()> {
        apply_batch_clear_handler(ctx, new_state_commitment, uniform_price)
    }

    /// Submit encrypted attestation for market resolution
    pub fn submit_attestation(
        ctx: Context<SubmitAttestation>,
        computation_offset: u64,
        attestation: [u8; 32],
    ) -> Result<()> {
        submit_attestation_handler(ctx, computation_offset, attestation)
    }

    /// Submit a batch order
    pub fn submit_batch_order(
        ctx: Context<SubmitBatchOrder>,
        computation_offset: u64,
        batch_orders: Vec<BatchOrderData>,
    ) -> Result<()> {
        submit_batch_order_handler(ctx, computation_offset, batch_orders)
    }

    /// Submit a private trade
    pub fn submit_private_trade(
        ctx: Context<SubmitPrivateTrade>,
        computation_offset: u64,
        encrypted_order: [u8; 32],
        client_pubkey: [u8; 32],
    ) -> Result<()> {
        submit_private_trade_handler(ctx, computation_offset, encrypted_order, client_pubkey)
    }

    /// Update CFMM state from private trade computation
    pub fn update_cfmm_state(
        ctx: Context<UpdateCfmmState>,
        new_state_commitment: [u8; 32],
        reserve_delta_yes: i64,
        reserve_delta_no: i64,
    ) -> Result<()> {
        update_cfmm_state_handler(
            ctx,
            new_state_commitment,
            reserve_delta_yes,
            reserve_delta_no,
        )
    }
}

// Accounts for initializing computation definitions (required by Arcium macros)
#[init_computation_definition_accounts("private_trade", payer)]
#[derive(Accounts)]
pub struct InitPrivateTradeCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program (not initialized yet)
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("batch_clear", payer)]
#[derive(Accounts)]
pub struct InitBatchClearCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program (not initialized yet)
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("resolve_market", payer)]
#[derive(Accounts)]
pub struct InitResolveMarketCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program (not initialized yet)
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// Event definitions
#[event]
pub struct PrivateTradeExecuted {
    pub market: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BatchCleared {
    pub market: Pubkey,
    pub uniform_price: u64,
    pub timestamp: i64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub outcome: u8,
    pub timestamp: i64,
}

#[event]
pub struct AttestationSubmitted {
    pub market: Pubkey,
    pub resolver: Pubkey,
    pub timestamp: i64,
    pub count: u8,
    pub quorum: u8,
}

#[event]
pub struct PrivateTradeQueued {
    pub market: Pubkey,
    pub user: Pubkey,
    pub timestamp: i64,
}
