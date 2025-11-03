#[encrypted]
mod circuits {
    use arcis_imports::*;

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
        orders_ctxt: Enc<Shared, Vec<BatchOrder>>,
        current_reserves_ctxt: Enc<Shared, (u64, u64)>,
    ) -> Enc<Shared, BatchClearResult> {
        let orders = orders_ctxt.to_arcis();
        let (yes_reserves, no_reserves) = current_reserves_ctxt.to_arcis();

        // Simplified batch clearing: calculate clearing price
        let mut total_yes_demand = 0u64;
        let mut total_no_demand = 0u64;

        for order in orders.iter() {
            if order.side {
                total_yes_demand += order.amount;
            } else {
                total_no_demand += order.amount;
            }
        }

        // Calculate clearing price (simplified)
        let clearing_price = if total_yes_demand > 0 && total_no_demand > 0 {
            (total_no_demand * 1000) / (total_yes_demand + total_no_demand)
        } else {
            500 // Default 50/50 if no demand
        };

        // Calculate fills based on clearing price
        let total_yes_filled = if clearing_price < 500 {
            total_yes_demand
        } else {
            total_yes_demand / 2
        };

        let total_no_filled = if clearing_price > 500 {
            total_no_demand
        } else {
            total_no_demand / 2
        };

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

        orders_ctxt.owner.from_arcis(result)
    }
}
