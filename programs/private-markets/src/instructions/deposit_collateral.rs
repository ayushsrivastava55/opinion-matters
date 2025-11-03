use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::error::MarketError;
use crate::state::*;
use crate::DepositCollateral; // Import account struct from crate root

pub fn handler(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
    require!(amount > 0, MarketError::InsufficientCollateral);

    // Transfer collateral from user to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_collateral.to_account_info(),
        to: ctx.accounts.collateral_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    msg!("Deposited {} collateral", amount);
    Ok(())
}
