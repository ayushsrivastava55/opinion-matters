# Arcium MPC Scripts

This directory contains utility scripts for initializing and testing the Arcium MPC integration.

## Scripts

### `init-comp-defs.ts`

Initializes the three Arcium computation definitions on devnet:
- `private_trade` - Private CFMM order execution
- `batch_clear` - Encrypted batch auction clearing
- `resolve_market` - Private market resolution

**Usage:**
```bash
npm run init:comp-defs
```

**Requirements:**
- Deployed program on devnet
- Wallet with SOL for transaction fees
- Valid MXE account address

**What it does:**
1. Derives computation definition PDAs for each circuit
2. Checks if already initialized (skips if exists)
3. Calls `init*CompDef` instructions
4. Logs transaction signatures

### `test-mpc-functions.ts`

Comprehensive test suite for all MPC-powered functions.

**Usage:**
```bash
npm run test:mpc
```

**Tests:**
1. **Setup:** Creates a test market with all necessary accounts
2. **Test Private Trade:** Submits an encrypted trade order
3. **Test Batch Order:** Submits a batch order for clearing
4. **Test Resolver Attestation:** Submits a resolver's attestation

**What it validates:**
- Account derivations (PDAs)
- Transaction building and signing
- Arcium account passing
- Event emissions

## Configuration

### Arcium Constants

```typescript
// Program IDs
const ARCIUM_PROGRAM_ID = "Arc1umF1yAXzJJaQheFMv3dJ34P6GYmr3yFetbGWJX6"

// MXE Account (Multi-party eXecution Environment)
const MXE_ACCOUNT = "35ee2NU9kRUojphAuHvaPX2YamVUmTZCgcy8LzDmpZqN3ugQ9Dv48BPeZgdgpYy98yRg5aoFeeoqVxmNHigJ8MZw"

// System Accounts
const ARCIUM_FEE_POOL = "FeeP11qo1qoqVW16Y2RSgMNmD2cuwVqkLHt4B6QRjpC"
const ARCIUM_CLOCK = "C1ockAccount11111111111111111111111111111111"

// Computation Offsets
const COMP_DEF_OFFSET_PRIVATE_TRADE = 1000
const COMP_DEF_OFFSET_BATCH_CLEAR = 2000
const COMP_DEF_OFFSET_RESOLVE_MARKET = 3000
```

## PDA Derivations

All scripts include helper functions for deriving Arcium-specific PDAs:

### Sign PDA
```typescript
function deriveSignPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("sign_pda")],
    programId
  );
  return pda;
}
```

### Computation Definition PDA
```typescript
function deriveCompDefPda(offset: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("computation_definition"),
      MXE_ACCOUNT.toBuffer(),
      Buffer.from(offset.toString().padStart(8, '0'))
    ],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}
```

### Mempool PDA
```typescript
function deriveMempoolPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mempool"), MXE_ACCOUNT.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}
```

### Execution Pool PDA
```typescript
function deriveExecpoolPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("execpool"), MXE_ACCOUNT.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}
```

### Computation PDA
```typescript
function deriveComputationPda(offset: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("computation"),
      MXE_ACCOUNT.toBuffer(),
      new anchor.BN(offset).toArrayLike(Buffer, "le", 8)
    ],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}
```

### Cluster PDA
```typescript
function deriveClusterPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cluster"), MXE_ACCOUNT.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}
```

## Troubleshooting

### MXE Account Format Issue

If you encounter `Invalid public key input` error:
- Verify the MXE account format with Arcium documentation
- The account string might need special encoding/decoding
- Check if it's a compressed or non-standard format

### Insufficient SOL

Ensure your wallet has enough SOL:
```bash
solana airdrop 2 --url devnet
```

### Computation Already Initialized

If a computation definition is already initialized, the script will skip it:
```
⏭️  private_trade already initialized, skipping...
```

### Transaction Timeout

If transactions timeout, try:
- Increasing RPC timeout
- Using a different RPC endpoint
- Retrying the transaction

## Development

### Adding New Tests

To add a new test function:

1. Create the test function:
```typescript
async function testNewFunction(
  program: Program<PrivateMarkets>,
  provider: anchor.AnchorProvider,
  market: PublicKey
) {
  // Your test code here
}
```

2. Call it from main():
```typescript
async function main() {
  // ... existing tests
  await testNewFunction(program, provider, market);
}
```

### Debugging

Enable verbose logging:
```typescript
console.log("Debug info:", {
  market: market.toString(),
  payer: provider.wallet.publicKey.toString(),
  // ... other relevant info
});
```

## Resources

- [Arcium Documentation](https://docs.arcium.com)
- [Arcium SDK](https://github.com/arcium-network/arcium-sdk)
- [Blackjack Example](https://github.com/arcium-network/examples/tree/main/blackjack)
- [Anchor Documentation](https://www.anchor-lang.com/)

---

*Part of the Arcium MPC Private Markets project for Colosseum Cypherpunk Hackathon*
