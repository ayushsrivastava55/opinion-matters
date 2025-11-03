use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    // ========== Private Trade Circuit ==========

    pub struct PrivateTradeInput {
        user_amount: u64,
        side: bool, // true for YES, false for NO
        max_price: u64,
    }

    pub struct CfmmState {
        yes_reserves: u64,
        no_reserves: u64,
    }

    #[instruction]
    pub fn private_trade(
        input_ctxt: Enc<Shared, PrivateTradeInput>,
        yes_reserves: u64,
        no_reserves: u64,
    ) -> Enc<Shared, CfmmState> {
        let input = input_ctxt.to_arcis();

        // CFMM logic: add to reserves based on trade side
        let new_yes_reserves = if input.side {
            yes_reserves + input.user_amount
        } else {
            yes_reserves
        };

        let new_no_reserves = if !input.side {
            no_reserves + input.user_amount
        } else {
            no_reserves
        };

        let new_state = CfmmState {
            yes_reserves: new_yes_reserves,
            no_reserves: new_no_reserves,
        };

        input_ctxt.owner.from_arcis(new_state)
    }

    // ========== Batch Clear Circuit ==========

    pub struct BatchOrder {
        amount: u64,
        side: bool,
        limit_price: u64,
    }

    pub struct BatchClearResult {
        clearing_price: u64,
        total_yes_filled: u64,
        total_no_filled: u64,
        new_yes_reserves: u64,
        new_no_reserves: u64,
    }

    #[instruction]
    pub fn batch_clear(
        // Single order for simplification - in production would aggregate multiple
        order_ctxt: Enc<Shared, BatchOrder>,
        yes_reserves: u64,
        no_reserves: u64,
    ) -> Enc<Shared, BatchClearResult> {
        let order = order_ctxt.to_arcis();

        // Simplified batch clearing logic
        let total_yes_demand = if order.side { order.amount } else { 0 };
        let total_no_demand = if !order.side { order.amount } else { 0 };

        // Calculate clearing price
        let clearing_price = if total_yes_demand > 0 && total_no_demand > 0 {
            (total_no_demand * 1000) / (total_yes_demand + total_no_demand)
        } else {
            500 // Default 50/50 if unbalanced
        };

        // Calculate fills
        let total_yes_filled = total_yes_demand / 2;
        let total_no_filled = total_no_demand / 2;

        // Update reserves
        let new_yes_reserves = yes_reserves + total_no_filled;
        let new_no_reserves = no_reserves + total_yes_filled;

        let result = BatchClearResult {
            clearing_price,
            total_yes_filled,
            total_no_filled,
            new_yes_reserves,
            new_no_reserves,
        };

        order_ctxt.owner.from_arcis(result)
    }

    // ========== Resolve Market Circuit ==========

    pub struct Attestation {
        outcome: bool, // true for YES, false for NO
        weight: u64,
    }

    pub struct ResolutionResult {
        final_outcome: bool,
        confidence: u64,
    }

    #[instruction]
    pub fn resolve_market(
        // Single attestation - in production would aggregate multiple
        attestation_ctxt: Enc<Shared, Attestation>,
    ) -> Enc<Shared, ResolutionResult> {
        let attestation = attestation_ctxt.to_arcis();

        // In production, this would aggregate weighted votes
        // For now, single attestation determines outcome
        let final_outcome = attestation.outcome;
        let confidence = attestation.weight;

        let result = ResolutionResult {
            final_outcome,
            confidence,
        };

        attestation_ctxt.owner.from_arcis(result)
    }
}
