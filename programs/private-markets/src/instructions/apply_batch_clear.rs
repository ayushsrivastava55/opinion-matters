use anchor_lang::prelude::*;
use crate::error::MarketError;
use crate::state::*;

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

pub fn handler(
    ctx: Context<ApplyBatchClear>,
    new_state_commitment: [u8; 32],
    uniform_price: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Check batch window has closed
    require!(
        clock.unix_timestamp >= market.next_batch_clear,
        MarketError::BatchWindowOpen
    );

    // Validate state commitment
    require!(
        new_state_commitment != [0u8; 32],
        MarketError::InvalidStateCommitment
    );

    // TODO: In production, verify Arcium MPC signature
    // This would include:
    // - Threshold signature from MPC nodes
    // - Proof that batch clearing computation was correct
    // - Merkle proofs for individual fills

    // Update market state with batch clear results
    market.cfmm_state_commitment = new_state_commitment;
    
    // Schedule next batch
    market.next_batch_clear = clock
        .unix_timestamp
        .checked_add(market.batch_interval)
        .ok_or(MarketError::Overflow)?;
    
    // Reset batch order count
    let cleared_orders = market.batch_order_count;
    market.batch_order_count = 0;
    market.batch_order_root = [0u8; 32];

    msg!("Batch cleared for market {}", market.key());
    msg!("Uniform price: {}", uniform_price);
    msg!("Orders cleared: {}", cleared_orders);
    msg!("Next batch clear: {}", market.next_batch_clear);

    emit!(BatchCleared {
        market: market.key(),
        uniform_price,
        orders_cleared: cleared_orders,
        new_state_commitment,
        next_batch_time: market.next_batch_clear,
    });

    Ok(())
}

#[event]
pub struct BatchCleared {
    pub market: Pubkey,
    pub uniform_price: u64,
    pub orders_cleared: u32,
    pub new_state_commitment: [u8; 32],
    pub next_batch_time: i64,
}
