use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod error;
pub mod constants;

use instructions::*;
use state::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod private_markets {
    use super::*;

    /// Initialize a new prediction market
    pub fn create_market(
        ctx: Context<CreateMarket>,
        question: String,
        end_time: i64,
        fee_bps: u16,
        batch_interval: i64,
        resolver_quorum: u8,
    ) -> Result<()> {
        instructions::create_market::handler(
            ctx,
            question,
            end_time,
            fee_bps,
            batch_interval,
            resolver_quorum,
        )
    }

    /// Deposit collateral into a market
    pub fn deposit_collateral(
        ctx: Context<DepositCollateral>,
        amount: u64,
    ) -> Result<()> {
        instructions::deposit_collateral::handler(ctx, amount)
    }

    /// Submit a private trade order (encrypted via Arcium)
    pub fn submit_private_trade(
        ctx: Context<SubmitPrivateTrade>,
        encrypted_order: Vec<u8>,
    ) -> Result<()> {
        instructions::submit_private_trade::handler(ctx, encrypted_order)
    }

    /// Submit an encrypted order for batch auction
    pub fn submit_batch_order(
        ctx: Context<SubmitBatchOrder>,
        order_commitment: [u8; 32],
    ) -> Result<()> {
        instructions::submit_batch_order::handler(ctx, order_commitment)
    }

    /// Apply batch clear results from Arcium MPC
    pub fn apply_batch_clear(
        ctx: Context<ApplyBatchClear>,
        new_state_commitment: [u8; 32],
        uniform_price: u64,
    ) -> Result<()> {
        instructions::apply_batch_clear::handler(ctx, new_state_commitment, uniform_price)
    }

    /// Stake tokens to become a resolver
    pub fn stake_resolver(
        ctx: Context<StakeResolver>,
        amount: u64,
    ) -> Result<()> {
        instructions::stake_resolver::handler(ctx, amount)
    }

    /// Submit encrypted attestation for market resolution
    pub fn submit_attestation(
        ctx: Context<SubmitAttestation>,
        encrypted_attestation: Vec<u8>,
    ) -> Result<()> {
        instructions::submit_attestation::handler(ctx, encrypted_attestation)
    }

    /// Apply resolution results from Arcium MPC
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        final_outcome: u8,
        resolution_proof: Vec<u8>,
    ) -> Result<()> {
        instructions::resolve_market::handler(ctx, final_outcome, resolution_proof)
    }

    /// Redeem outcome tokens for collateral
    pub fn redeem_tokens(
        ctx: Context<RedeemTokens>,
        amount: u64,
    ) -> Result<()> {
        instructions::redeem_tokens::handler(ctx, amount)
    }

    /// Update CFMM state from private trade computation
    pub fn update_cfmm_state(
        ctx: Context<UpdateCfmmState>,
        new_state_commitment: [u8; 32],
        reserve_delta_yes: i64,
        reserve_delta_no: i64,
    ) -> Result<()> {
        instructions::update_cfmm_state::handler(
            ctx,
            new_state_commitment,
            reserve_delta_yes,
            reserve_delta_no,
        )
    }
}
