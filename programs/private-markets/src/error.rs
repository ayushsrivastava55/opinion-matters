use anchor_lang::prelude::*;

#[error_code]
pub enum MarketError {
    #[msg("Question exceeds maximum length")]
    QuestionTooLong,
    
    #[msg("Invalid end time (must be in the future)")]
    InvalidEndTime,
    
    #[msg("Fee basis points out of range")]
    InvalidFeeBps,
    
    #[msg("Batch interval out of range")]
    InvalidBatchInterval,
    
    #[msg("Market has already ended")]
    MarketEnded,
    
    #[msg("Market has not ended yet")]
    MarketNotEnded,
    
    #[msg("Market is already resolved")]
    MarketAlreadyResolved,
    
    #[msg("Market is not resolved yet")]
    MarketNotResolved,
    
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    
    #[msg("Invalid resolver quorum")]
    InvalidQuorum,
    
    #[msg("Not enough resolvers staked")]
    InsufficientResolvers,
    
    #[msg("Insufficient stake amount")]
    InsufficientStake,
    
    #[msg("Resolver already staked")]
    ResolverAlreadyStaked,
    
    #[msg("Invalid attestation")]
    InvalidAttestation,
    
    #[msg("Batch clearing window has not ended")]
    BatchWindowOpen,
    
    #[msg("Invalid state commitment")]
    InvalidStateCommitment,
    
    #[msg("Arithmetic overflow")]
    Overflow,
    
    #[msg("Invalid outcome value")]
    InvalidOutcome,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Invalid CFMM state")]
    InvalidCfmmState,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Arcium MPC computation failed")]
    ComputationFailed,

    #[msg("Arcium MPC computation aborted")]
    ComputationAborted,

    #[msg("Invalid resolution state")]
    InvalidResolutionState,

    #[msg("Cluster not set")]
    ClusterNotSet,
}
