# Arcium Setup Guide

## Current Status

The Arcium installation is experiencing network connectivity issues with their CDN. This is a temporary issue with their servers.

## Manual Installation (When Service is Available)

### Option 1: Automatic Installation
```bash
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
```

### Option 2: Manual Installation
For Apple Silicon (M1/M2/M3):
```bash
TARGET=aarch64_macos
curl "https://bin.arcium.com/download/arcup_${TARGET}_0.3.0" -o ~/.cargo/bin/arcup
chmod +x ~/.cargo/bin/arcup
arcup install
```

For Intel Mac:
```bash
TARGET=x86_64_macos
curl "https://bin.arcium.com/download/arcup_${TARGET}_0.3.0" -o ~/.cargo/bin/arcup
chmod +x ~/.cargo/bin/arcup
arcup install
```

### Verify Installation
```bash
arcium --version
arx --version
```

## Next Steps After Arcium Installation

### 1. Initialize Arcium Computations

Our program needs three confidential computation definitions:

#### a. PrivateTrade Computation
```bash
# This will be in programs/private-markets/mxe/private_trade.rs
```

Purpose: Process encrypted trade orders through CFMM
- Input: Encrypted order (side, amount, slippage)
- Computation: CFMM price calculation, reserve updates
- Output: New state commitment + reserve deltas

#### b. BatchClear Computation
```bash
# This will be in programs/private-markets/mxe/batch_clear.rs
```

Purpose: Clear batch auction with sealed bids
- Input: Encrypted order commitments
- Computation: Uniform price calculation, fill matching
- Output: Clearing price + new CFMM state

#### c. ResolveMarket Computation
```bash
# This will be in programs/private-markets/mxe/resolve_market.rs
```

Purpose: Aggregate private resolver attestations
- Input: Encrypted attestations from resolvers
- Computation: Weighted aggregation (median/threshold)
- Output: Final outcome + proof signatures

### 2. Configure MPC Cluster

Create `arcium_config.toml`:
```toml
[network]
cluster = "devnet"
rpc_url = "https://api.devnet.solana.com"

[mpc]
protocol = "cerberus"  # Strongest security guarantees
threshold = 2  # Minimum honest nodes
total_nodes = 3

[callbacks]
enable = true
server_url = "http://localhost:3001/callback"  # Optional, for large outputs
```

### 3. Build and Deploy

```bash
# Build with Arcium
arcium build

# Test locally
arcium test

# Deploy to devnet
arcium deploy --cluster devnet

# Initialize computation definitions
arcium init-computations
```

### 4. Update Program to Use Arcium Program ID

After deploying, update `programs/private-markets/src/lib.rs`:
```rust
declare_id!("YourArciumProgramIdHere");
```

And update `Anchor.toml`:
```toml
[programs.devnet]
private_markets = "YourArciumProgramIdHere"
```

## Alternative: Build Without Arcium First

You can test the core Solana program logic without Arcium integration:

```bash
# Regular Anchor build
anchor build

# Run tests (will use mock encrypted data)
anchor test --skip-local-validator

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

This lets you validate:
- Market creation
- Collateral deposits
- Order submission (with mock encrypted data)
- State management
- Redemption flows

Then integrate Arcium MPC when the service is available.

## Documentation References

- Arcium Developers: https://docs.arcium.com/developers
- Installation Guide: https://docs.arcium.com/developers/installation
- Hello World Tutorial: https://docs.arcium.com/developers/hello-world
- Computation Lifecycle: https://docs.arcium.com/developers/computation-lifecycle
- Deployment Guide: https://docs.arcium.com/developers/deployment

## Troubleshooting

### Network Issues
If you continue to experience connectivity issues:
1. Check your firewall settings
2. Try from a different network
3. Contact Arcium support on Discord: https://discord.com/invite/arcium
4. Check Arcium status page (if available)

### Dependencies Missing
Ensure all prerequisites are installed:
```bash
# Check versions
rustc --version  # Should be 1.75+
solana --version  # Should be 1.18+
anchor --version  # Should be 0.30+
yarn --version
docker --version
```

### Build Errors
If Arcium build fails:
1. Clear cache: `rm -rf .anchor target`
2. Update dependencies: `cargo update`
3. Rebuild: `arcium build --force`

## Contact & Support

- Arcium Discord: https://discord.com/invite/arcium
- Arcium Docs: https://docs.arcium.com
- GitHub Examples: https://github.com/arcium-hq/examples
