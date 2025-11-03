# PRD: Permissionless, Fair, Private Prediction & Opinion Markets on Solana with Arcium

## Executive Summary
- Build a permissionless market protocol where user information (orders, positions, signals) stays private by default, ensuring fair play and minimizing manipulation.
- Use Arcium's MPC-powered confidential compute to process encrypted market actions while preserving verifiability on Solana.
- Deliver a working MVP for the Colosseum Cypherpunk hackathon (Arcium side track) with a demo, docs, and references.

## Goals and Non-Goals

### Goals
- Confidential trading and position privacy using Arcium MXEs.
- Manipulation-resistant price discovery via sealed-bid batch auctions and private CFMM.
- Trust-minimized market resolution using staked resolvers with MPC aggregation.
- Fully permissionless market creation with guardrails.

### Non-Goals
- Full-blown compliance/legal tooling.
- Cross-chain bridge or complex oracle integrations beyond MVP.
- Enterprise-grade throughput at launch.

## Problem & Rationale
- Open markets leak information (orders, positions), enabling front-running, herding, and manipulation.
- Opinion markets require truthful private signaling; public signals bias crowds and can be censored.
- Arcium enables encrypted computation at scale, keeping inputs secret while preserving correctness and onchain settlement.

## Target Users
- Traders seeking fair execution without information leakage.
- Communities running opinion markets without social pressure or retaliation.
- Protocol builders wanting private market mechanisms as a primitive.
- Data providers acting as resolvers who prefer privacy-preserving attestation.

## Key User Stories
- As a trader, I deposit collateral and submit private orders that are matched fairly without price/size leakage.
- As a market creator, I open a binary market with parameters and fees, without custodial control.
- As a resolver, I privately submit my attestation to resolution logic and get rewarded/slashed based on MPC-verified outcomes.

## Requirements

### Functional
- Private trading for binary markets.
- Private market creation with configurable fees, resolution quorum, and timeframe.
- Batch auction clearing at intervals to reduce time-based manipulation.
- Private CFMM quotes for continuous trades between batches.
- Private resolution: MPC aggregates resolver attestations and outputs final result with onchain settlement.
- Payout mint/burn via SPL tokens for YES/NO claims.
- Public verifiability: onchain program verifies Arcium computation inclusion and signatures.

### Non-Functional
- Low-latency settlement on devnet/testnet.
- Privacy preserving by default for orders, positions, and resolver inputs.
- Liveness under partial Arcium node failures (cluster BFT assumptions).
- Cost efficiency: minimal onchain writes, compact outputs, callback-server for large payloads if needed.

### Hackathon Deliverables
- Devnet deployment of MXE program and front-end.
- Recorded demo and README with steps.
- Documentation citing Arcium docs and constraints.
- Public repo and test cases.

## Constraints from Arcium (Docs-backed)
- Confidential compute runs in MPC clusters; inputs encrypted by client; MXE program submits jobs to Arcium; nodes process and return results while data remains encrypted.
- Use Arcis (Anchor-extended) to write confidential instructions in Rust; mark instructions as confidential.
- TS Client SDK for encryption, job submission, and result handling.
- Callback Server is required if output exceeds a single Solana transaction capacity.
- Current limitations: output sizes; plan for callbacks when returning large sets (e.g., orderbook snapshots).
- Two MPC stacks:
  - **Cerberus**: strongest security (authenticated shares, identify malicious behavior). Preferred for critical financial fairness.
  - **Manticore**: faster with trusted-dealer assumptions (honest-but-curious). Consider for ML/opinion aggregation if speed-critical.
- Node setup, cluster selection, and deployment flows are covered in docs (see Resources).

## Solution Overview

### Design Principles
- Privacy by default over orders, positions, and resolver inputs.
- Verifiable settlement onchain; all confidential compute outputs are minimal, compact, and signature-verified.
- Manipulation resistance via sealed-bid batch auctions + private CFMM in between.

### Mechanism Design
- **Batch auctions**: periodic sealed-bid clearing to compute uniform price; reduces timing/miner extractable value.
- **Private CFMM**: CPMM for binary (YES/NO) with private inputs; output only price and state deltas to onchain.
- **Anti-manipulation**:
  - Private orders prevent copy-trading and spoofing.
  - Batch clearing windows mitigate time-priority exploitation.
  - Position privacy reduces herding and squeeze attempts.
  - Dispute/circuit-breakers if extreme slippage or abnormal price jump computed by MPC.
- **Resolution**:
  - Resolver set stakes tokens; submit encrypted attestations during resolution window.
  - MPC aggregates (weighted median or threshold) and emits final result with proofs/signatures.
  - Slash misaligned resolvers on obvious contradictions or onchain reality checks.

## Architecture

### Components
- **Onchain (Solana)**
  - MXE Program (Arcis): market registry, collateral vaults, CFMM state, batch schedule, outcome token mints, fees, resolver staking, settlement.
  - SPL tokens for collateral and outcome claims (YES/NO).
- **Arcium (Confidential compute)**
  - Computation definitions:
    - `PrivateTrade`: validates collateral, computes CFMM deltas, updates running state commitments.
    - `BatchClear`: clears sealed orders to a uniform price, computes fills, final CFMM state.
    - `ResolveMarket`: aggregates encrypted resolver attestations and outputs final outcome.
  - Cerberus cluster (recommended) for fairness-critical computation.
- **Client**
  - TS SDK for encryption and job submission.
  - Wallet (Phantom) for signing transactions.
  - Next.js app for UX.
- **Optional**
  - Callback Server for large outputs (e.g., bulk fill receipts or snapshots).

### Sequence Flows

#### Market Creation
- Creator submits onchain tx to open market with params (oracle/resolvers config, fee, end time).
- MXE stores market account; initializes outcome mints.

#### Private Trade (Continuous)
- User deposits collateral to vault (onchain).
- Client encrypts trade (side, size, slippage) and calls `PrivateTrade` via Arcium.
- Arcium returns compact state delta (new reserves, price) and opaque proofs/signatures.
- MXE verifies and applies state changes; mints/burns outcome tokens.

#### Batch Auction
- Users submit encrypted orders during window; commitments posted onchain as hashes.
- At window end, `BatchClear` runs in MPC to compute uniform price and fills.
- Result applied onchain; receipts may come via callback if large.

#### Resolution and Payout
- Resolvers stake and then submit private attestations via MPC.
- `ResolveMarket` aggregates; emits final outcome to onchain.
- Users redeem outcome tokens for collateral; slashes misreporting resolvers.

### Data Model (Onchain)
- **Market**
  - `authority`, `metadata`, `fee_bps`, `end_ts`
  - `resolver_set_pubkeys`, `quorum`, `stake_token_mint`
  - `cfmm_state_commitment` (commitment to confidential state)
  - `batch_schedule` (interval, next_clear_ts)
- **Vaults**
  - `collateral_vault` (SPL)
  - `fee_vault`
- **Outcome Mints**
  - `yes_mint`, `no_mint`
- **Positions**
  - token accounts holding YES/NO SPL tokens
- **Commitments**
  - `order_root_commitment` (for sealed orders)
  - `state_commitments` (rolling commitments to CFMM state and batch order books)

### Confidential Computations (Arcis)
- **PrivateTrade**(input: encrypted order, current_state_commitment)
  - Validates balance and constraints.
  - Applies CPMM math privately.
  - Outputs `new_state_commitment` + minimal deltas + node signatures.
- **BatchClear**(input: encrypted_orders_root, cfmm_state)
  - Computes uniform price, fills, fees.
  - Outputs `new_state_commitment` + optional receipts.
- **ResolveMarket**(input: encrypted_attestations, stakes)
  - Aggregates to `final_result` + justification signature set.

### Verification and Outputs
- MXE Program verifies computation inclusion using Arcium's program guarantees.
- For large outputs, use Callback Server API `POST /callback` with signed payload; onchain state references callback data hash.

## Economics and Fees
- **Fees**: protocol fee on trades and redemption, configurable by market creator.
- **Liquidity**: initial seeding via deposits; optional private LP orders.
- **Resolver staking**: slashable stake to secure resolution; rewards for honest participation.
- **Anti-Sybil**: deposit requirements, minimal fee schedule, and optional proof-of-uniqueness integrations post-MVP.

## Security, Privacy, and Trust

### Threat Model
- **Front-running**: mitigated by private orders and batch auctions.
- **Order spoofing and copy-trading**: private orders minimize signal leakage.
- **Oracle bribery**: MPC aggregation of multiple resolvers with stake and slashing.
- **MPC collusion**: prefer Cerberus; diversify cluster operators; slash/eject faulty nodes in future versions.

### Privacy Leakage Analysis
- Outputs leak only prices and aggregate state deltas.
- Side-channel risks minimized by avoiding large data outputs during trading; batch results via callback.

### Trust Assumptions
- At least one honest node (Cerberus).
- Onchain verification of MPC outputs via Arcium program.

## Performance & Limitations
- Output size limits on Solana: use Callback Server for bulk receipts or snapshots.
- Batch windows configurable to balance latency vs. fairness.
- Devnet/testnet RPC recommendations per Arcium docs.

## Development Plan and Milestones

### Week 1
- [x] Complete PRD with architecture and resources
- [x] Arcis MXE scaffold and project structure
- [x] CFMM state, collateral vault, outcome mints, market registry
- [x] All instruction handlers implemented
- [x] Basic test suite created
- [ ] Arcium CLI integration (pending network issues)

### Week 2
- [ ] PrivateTrade and BatchClear computations (Cerberus cluster)
- [ ] Basic Resolver staking and ResolveMarket computation
- [ ] TypeScript SDK with Arcium encryption
- [ ] Integration testing with MPC flows

### Week 3
- [ ] Frontend MVP (Phantom, market list, trade, redeem)
- [ ] Callback Server for batch receipts (if needed)
- [ ] Devnet deployment
- [ ] End-to-end testing

### Week 4
- [ ] Polish UI/UX
- [ ] Demo video recording
- [ ] Final documentation
- [ ] Hackathon submission

## Testing & Validation
- Unit tests for MXE program logic (Anchor/Arcis).
- MPC integration tests for each computation definition (mock inputs, deterministic checks).
- End-to-end flows on devnet:
  - Create market → deposit → private trade → batch clear → resolution → redeem.
- Adversarial tests: oversized orders, invalid commitments, resolution disputes.

## Launch & Submission
- Deploy on devnet/testnet with recommended RPC providers.
- Public repo with README, architecture diagrams (text), and linked docs.
- Video demo: flow walkthrough and privacy guarantees.
- Include Official Rules and resources links in submission.

## Risks & Mitigations
- **MPC liveness**: fallback to next batch or limited continuous CFMM mode.
- **Resolver collusion**: higher quorum, stake-weighting, and slashing conditions.
- **Data leakage over time**: rotate batch intervals, restrict high-frequency queries, and publish minimal aggregates.

## Future Roadmap (Beyond Hackathon)
- Multi-outcome markets with private LMSR.
- Private limit order books and iceberg orders.
- DAO governance for resolver set and fee parameters.
- Private conditional markets and combinatorial overlays.
- Cross-chain settlement and oracle expansion.
- Open-sourced Arcium computation templates for builders.

## Implementation Notes (Docs-backed)
- Use Arcium CLI and Arcis to mark confidential instructions.
- TS SDK for encrypting inputs, job submission, and result handling.
- Computation Lifecycle as the reference for component roles and data flow.
- Callback Server `POST /callback` for larger outputs.
- Current Limitations: plan around output size caps.
- Prefer Cerberus for fairness-critical compute; consider Manticore for fast opinion aggregation post-MVP.

## Resources Appendix

### Arcium Developers (Intro, CLI, Hello World, Lifecycle, Deployment, Callback, Limitations, Node Setup)
- Intro to Arcium: https://docs.arcium.com/developers
- Installation: https://docs.arcium.com/developers/installation
- Hello World: https://docs.arcium.com/developers/hello-world
- Computation Lifecycle: https://docs.arcium.com/developers/computation-lifecycle
- Deployment: https://docs.arcium.com/developers/deployment
- Callback Server (POST /callback): https://docs.arcium.com/developers/callback-server
- Current Limitations (output sizes): https://docs.arcium.com/developers/limitations
- Setup a Testnet Node: https://docs.arcium.com/developers/node-setup
- Arcis framework (Anchor extension): https://docs.arcium.com/developers/arcis
- TypeScript Client Library: https://docs.arcium.com/developers/js-client-library

### Arcium Concepts and Protocols
- Overview: https://docs.arcium.com/
- Basic Concepts (Encrypted supercomputer, clusters/MXEs, BFT, epochs): https://docs.arcium.com/introduction/basic-concepts
- MPC Protocols (FHE/TEE/ZK vs MPC; MPC at Arcium): https://docs.arcium.com/multi-party-execution-environments-mxes/mpc-protocols

### SDK Reference and Examples
- TS SDK API: https://ts.arcium.com/api
- TS SDK portal: https://ts.arcium.com/
- Arcium Examples repo: https://github.com/arcium-hq/examples

### Prediction Market Context (Arcium)
- The Future of Prediction Markets Using Arcium: https://www.arcium.com/articles/the-future-of-prediction-markets-using-arcium

### Colosseum Cypherpunk Hackathon
- Main page: https://www.colosseum.com/cypherpunk
- Developer Resources: https://www.colosseum.com/cypherpunk/resources
- Official Rules (PDF): https://www.colosseum.com/files/Solana%20Cypherpunk%20Hackathon%20Official%20Rules.pdf
- Solana Dev Docs (general): https://solana.com/docs/intro/quick-start
- Phantom Dev Docs: https://docs.phantom.app/

## Suggestions to Make It Better
- Use resolver committees with rotating memberships and blinded attestations to reduce bribery.
- Add a privacy budget policy for repeated queries to prevent inference attacks.
- Publish verifiable aggregate metrics (e.g., TVL, total trades) with differential privacy.
- Offer private LP provisioning for better liquidity without doxxing.
- Provide a "view key" option for auditors.
