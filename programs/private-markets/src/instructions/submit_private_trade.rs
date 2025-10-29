use anchor_lang::prelude::*;
use crate::error::MarketError;
use crate::state::*;

#[derive(Accounts)]
pub struct SubmitPrivateTrade<'info> {
    #[account(
        mut,
        constraint = market.resolution_state == ResolutionState::Active @ MarketError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub user: Signer<'info>,
}

pub fn handler(
    ctx: Context<SubmitPrivateTrade>,
    encrypted_order: Vec<u8>,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Check market hasn't ended
    require!(
        clock.unix_timestamp < market.end_time,
        MarketError::MarketEnded
    );

    // Validate encrypted order is not empty
    require!(
        !encrypted_order.is_empty(),
        MarketError::InvalidStateCommitment
    );

    // In a full implementation, this would:
    // 1. Submit encrypted_order to Arcium MPC cluster
    // 2. Arcium nodes would:
    //    - Decrypt order collaboratively
    //    - Validate user has sufficient collateral
    //    - Compute CFMM price impact
    //    - Update private CFMM state
    //    - Return new state commitment + minimal public deltas
    // 3. Call update_cfmm_state with results
    //
    // For now, we store the order commitment and emit an event
    // The Arcium computation will be triggered off-chain

    msg!(
        "Private trade submitted for market {} by user {}",
        market.key(),
        ctx.accounts.user.key()
    );
    msg!("Encrypted order length: {}", encrypted_order.len());

    // Emit event for off-chain Arcium trigger
    emit!(PrivateTradeSubmitted {
        market: market.key(),
        user: ctx.accounts.user.key(),
        timestamp: clock.unix_timestamp,
        order_size: encrypted_order.len() as u32,
    });

    Ok(())
}

#[event]
pub struct PrivateTradeSubmitted {
    pub market: Pubkey,
    pub user: Pubkey,
    pub timestamp: i64,
    pub order_size: u32,
}
