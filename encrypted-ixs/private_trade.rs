#[encrypted]
mod circuits {
    use arcis_imports::*;

    pub struct PrivateTradeInput {
        user_amount: u64,
        side: bool, // true for YES, false for NO
        max_price: u64,
    }

    pub struct CfmmState {
        yes_reserves: u64,
        no_reserves: u64,
        new_commitment: [u8; 32],
    }

    #[instruction]
    pub fn private_trade(
        input_ctxt: Enc<Shared, PrivateTradeInput>,
        state_ctxt: Enc<Shared, CfmmState>,
    ) -> Enc<Shared, CfmmState> {
        let input = input_ctxt.to_arcis();
        let state = state_ctxt.to_arcis();

        // Simple CFMM logic: add to reserves based on trade
        let (new_yes_reserves, new_no_reserves) = if input.side {
            // Buying YES tokens
            (
                state.yes_reserves + input.user_amount,
                state.no_reserves,
            )
        } else {
            // Buying NO tokens
            (
                state.yes_reserves,
                state.no_reserves + input.user_amount,
            )
        };

        // Create new state commitment (simplified - just hash new reserves)
        let mut new_commitment = [0u8; 32];
        new_commitment[0..8].copy_from_slice(&new_yes_reserves.to_le_bytes());
        new_commitment[8..16].copy_from_slice(&new_no_reserves.to_le_bytes());

        let new_state = CfmmState {
            yes_reserves: new_yes_reserves,
            no_reserves: new_no_reserves,
            new_commitment,
        };

        input_ctxt.owner.from_arcis(new_state)
    }
}
