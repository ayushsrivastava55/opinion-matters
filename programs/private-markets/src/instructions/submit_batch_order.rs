use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::MarketError;
use crate::state::*;

#[derive(Accounts)]
pub struct SubmitBatchOrder<'info> {
    #[account(
        mut,
        constraint = market.resolution_state == ResolutionState::Active @ MarketError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub user: Signer<'info>,
}

pub fn handler(
    ctx: Context<SubmitBatchOrder>,
    order_commitment: [u8; 32],
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Check market hasn't ended
    require!(
        clock.unix_timestamp < market.end_time,
        MarketError::MarketEnded
    );

    // Check we're within a batch window
    require!(
        clock.unix_timestamp < market.next_batch_clear,
        MarketError::BatchWindowOpen
    );

    // Validate order commitment
    require!(
        order_commitment != [0u8; 32],
        MarketError::InvalidStateCommitment
    );

    // In production, this would:
    // 1. Store order commitment in a merkle tree
    // 2. Update batch_order_root with new merkle root
    // For now, we update the count and fold commitment into a pseudo-root (XOR)

    market.batch_order_count = market
        .batch_order_count
        .checked_add(1)
        .ok_or(MarketError::Overflow)?;

    // pseudo-root: XOR with incoming commitment (placeholder only)
    let mut new_root = market.batch_order_root;
    for i in 0..32 {
        new_root[i] ^= order_commitment[i];
    }
    market.batch_order_root = new_root;

    msg!(
        "Batch order submitted for market {} by user {}",
        market.key(),
        ctx.accounts.user.key()
    );
    msg!("Order commitment: {:?}", order_commitment);
    msg!("Total batch orders: {}", market.batch_order_count);

    emit!(BatchOrderSubmitted {
        market: market.key(),
        user: ctx.accounts.user.key(),
        order_commitment,
        batch_clear_time: market.next_batch_clear,
        order_number: market.batch_order_count,
    });

    Ok(())
}

#[event]
pub struct BatchOrderSubmitted {
    pub market: Pubkey,
    pub user: Pubkey,
    pub order_commitment: [u8; 32],
    pub batch_clear_time: i64,
    pub order_number: u32,
}
