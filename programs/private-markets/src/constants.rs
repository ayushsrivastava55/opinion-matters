use anchor_lang::prelude::*;

/// Maximum question length for markets
pub const MAX_QUESTION_LEN: usize = 200;

/// Maximum number of resolvers per market
pub const MAX_RESOLVERS: usize = 10;

/// Minimum fee basis points (0.1%)
pub const MIN_FEE_BPS: u16 = 10;

/// Maximum fee basis points (10%)
pub const MAX_FEE_BPS: u16 = 1000;

/// Minimum batch interval in seconds (5 minutes)
pub const MIN_BATCH_INTERVAL: i64 = 300;

/// Maximum batch interval in seconds (24 hours)
pub const MAX_BATCH_INTERVAL: i64 = 86400;

/// Minimum resolver quorum
pub const MIN_QUORUM: u8 = 1;

/// CFMM constant product multiplier (for precision)
pub const CFMM_PRECISION: u64 = 1_000_000;

/// Initial CFMM reserves for each side
pub const INITIAL_RESERVES: u64 = 1_000_000 * CFMM_PRECISION;

/// Seed for market PDA
pub const MARKET_SEED: &[u8] = b"market";

/// Seed for collateral vault PDA
pub const VAULT_SEED: &[u8] = b"vault";

/// Seed for fee vault PDA
pub const FEE_VAULT_SEED: &[u8] = b"fee_vault";

/// Seed for yes token mint PDA
pub const YES_MINT_SEED: &[u8] = b"yes_mint";

/// Seed for no token mint PDA
pub const NO_MINT_SEED: &[u8] = b"no_mint";

/// Seed for resolver account PDA
pub const RESOLVER_SEED: &[u8] = b"resolver";

/// Seed for batch state PDA
pub const BATCH_SEED: &[u8] = b"batch";
