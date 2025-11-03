pub mod apply_batch_clear;
pub mod create_market;
pub mod deposit_collateral;
pub mod mint_outcome_tokens;
pub mod redeem_tokens;
pub mod resolve_market;
pub mod stake_resolver;
pub mod submit_attestation;
pub mod submit_batch_order;
pub mod submit_private_trade;
pub mod update_cfmm_state;

// Re-export only handlers (account structs and events are in lib.rs at crate root)
pub use apply_batch_clear::{handler as apply_batch_clear_handler};
pub use create_market::{handler as create_market_handler};
pub use deposit_collateral::{handler as deposit_collateral_handler};
pub use mint_outcome_tokens::{handler as mint_outcome_tokens_handler};
pub use redeem_tokens::{handler as redeem_tokens_handler};
pub use resolve_market::{handler as resolve_market_handler};
pub use stake_resolver::{handler as stake_resolver_handler};
pub use update_cfmm_state::{handler as update_cfmm_state_handler};

// Export only handlers for Arcium instructions (structs, callbacks, and events are in lib.rs)
pub use submit_attestation::{handler as submit_attestation_handler};
pub use submit_batch_order::{handler as submit_batch_order_handler};
pub use submit_private_trade::{handler as submit_private_trade_handler};
