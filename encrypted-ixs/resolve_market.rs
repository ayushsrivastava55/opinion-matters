#[encrypted]
mod circuits {
    use arcis_imports::*;

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
        attestations_ctxt: Enc<Shared, Vec<Attestation>>,
    ) -> Enc<Shared, ResolutionResult> {
        let attestations = attestations_ctxt.to_arcis();

        // Weighted voting: sum weights for each outcome
        let mut yes_weight = 0u64;
        let mut no_weight = 0u64;

        for attestation in attestations.iter() {
            if attestation.outcome {
                yes_weight += attestation.weight;
            } else {
                no_weight += attestation.weight;
            }
        }

        // Determine outcome based on weighted majority
        let final_outcome = yes_weight > no_weight;
        let confidence = if final_outcome {
            yes_weight
        } else {
            no_weight
        };

        let result = ResolutionResult {
            final_outcome,
            confidence,
        };

        attestations_ctxt.owner.from_arcis(result)
    }
}
