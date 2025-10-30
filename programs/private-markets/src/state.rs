use anchor_lang::prelude::*;
use crate::constants::*;

/// Market state for a prediction market
#[account]
pub struct Market {
    /// Market authority (creator)
    pub authority: Pubkey,
    
    /// Market question
    pub question: String,
    
    /// End timestamp (unix)
    pub end_time: i64,
    
    /// Fee in basis points
    pub fee_bps: u16,
    
    /// Batch auction interval in seconds
    pub batch_interval: i64,
    
    /// Next batch clear timestamp
    pub next_batch_clear: i64,
    
    /// Resolver quorum requirement
    pub resolver_quorum: u8,
    
    /// Number of resolvers currently staked
    pub resolver_count: u8,

    /// Number of resolvers who have submitted an attestation
    pub attestation_count: u8,
    
    /// Collateral vault
    pub collateral_vault: Pubkey,
    
    /// Fee vault
    pub fee_vault: Pubkey,
    
    /// YES outcome token mint
    pub yes_mint: Pubkey,
    
    /// NO outcome token mint
    pub no_mint: Pubkey,
    
    /// CFMM state commitment (hash of encrypted reserves)
    pub cfmm_state_commitment: [u8; 32],
    
    /// Current YES reserves (public aggregate)
    pub yes_reserves: u64,
    
    /// Current NO reserves (public aggregate)
    pub no_reserves: u64,
    
    /// Total volume traded
    pub total_volume: u64,
    
    /// Batch order commitment root
    pub batch_order_root: [u8; 32],
    
    /// Number of orders in current batch
    pub batch_order_count: u32,
    
    /// Market resolution state
    pub resolution_state: ResolutionState,
    
    /// Final outcome (0 = NO, 1 = YES, 255 = unresolved)
    pub final_outcome: u8,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl Market {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        4 + MAX_QUESTION_LEN + // question (string)
        8 + // end_time
        2 + // fee_bps
        8 + // batch_interval
        8 + // next_batch_clear
        1 + // resolver_quorum
        1 + // resolver_count
        1 + // attestation_count
        32 + // collateral_vault
        32 + // fee_vault
        32 + // yes_mint
        32 + // no_mint
        32 + // cfmm_state_commitment
        8 + // yes_reserves
        8 + // no_reserves
        8 + // total_volume
        32 + // batch_order_root
        4 + // batch_order_count
        1 + // resolution_state
        1 + // final_outcome
        1; // bump
}

/// Resolution state enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ResolutionState {
    /// Market is active
    Active,
    /// Market ended, awaiting attestations
    AwaitingAttestation,
    /// Attestations submitted, computing resolution
    Computing,
    /// Market resolved
    Resolved,
}

/// Resolver account
#[account]
pub struct Resolver {
    /// Resolver pubkey
    pub authority: Pubkey,
    
    /// Market this resolver is staking for
    pub market: Pubkey,
    
    /// Amount staked
    pub stake_amount: u64,
    
    /// Has submitted attestation
    pub has_attested: bool,
    
    /// Encrypted attestation commitment
    pub attestation_commitment: [u8; 32],
    
    /// Timestamp of stake
    pub staked_at: i64,
    
    /// Bump seed
    pub bump: u8,
}

impl Resolver {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // market
        8 + // stake_amount
        1 + // has_attested
        32 + // attestation_commitment
        8 + // staked_at
        1; // bump
}

/// Batch state for batch auctions
#[account]
pub struct BatchState {
    /// Market this batch belongs to
    pub market: Pubkey,
    
    /// Batch epoch number
    pub epoch: u64,
    
    /// Batch start time
    pub start_time: i64,
    
    /// Batch end time
    pub end_time: i64,
    
    /// Order commitments merkle root
    pub order_root: [u8; 32],
    
    /// Number of orders
    pub order_count: u32,
    
    /// Batch state (open, closed, cleared)
    pub state: BatchStateEnum,
    
    /// Uniform clearing price (after clearing)
    pub clearing_price: u64,
    
    /// Bump seed
    pub bump: u8,
}

impl BatchState {
    pub const LEN: usize = 8 + // discriminator
        32 + // market
        8 + // epoch
        8 + // start_time
        8 + // end_time
        32 + // order_root
        4 + // order_count
        1 + // state
        8 + // clearing_price
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BatchStateEnum {
    Open,
    Closed,
    Cleared,
}

/// User position tracking (optional, for easier UX)
#[account]
pub struct UserPosition {
    /// User pubkey
    pub authority: Pubkey,
    
    /// Market
    pub market: Pubkey,
    
    /// YES tokens held
    pub yes_amount: u64,
    
    /// NO tokens held
    pub no_amount: u64,
    
    /// Total collateral deposited
    pub collateral_deposited: u64,
    
    /// Bump seed
    pub bump: u8,
}

impl UserPosition {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // market
        8 + // yes_amount
        8 + // no_amount
        8 + // collateral_deposited
        1; // bump
}
