# Running with Arcium Localnet - Step by Step Guide

## Overview

Since devnet cluster 69069069 has no active ARX nodes, we'll use Arcium localnet which:
- ✅ Starts 3 local ARX nodes
- ✅ Runs DKG to generate real MXE encryption keys
- ✅ Deploys your program properly
- ✅ Enables true MPC-secure encryption
- ✅ NO FALLBACKS - everything works as designed

## Prerequisites

✅ Arcium CLI 0.3.0 (installed)
✅ Solana CLI (installed)
✅ Anchor 0.31.1 (installed)
⚠️ Docker (check if installed: `docker --version`)

If Docker not installed:
```bash
# macOS
brew install --cask docker
# Then open Docker Desktop from Applications
```

## Step-by-Step Setup

### Step 1: Prepare the Project

```bash
cd /Users/ayush/Documents/hackathons/cyberpunk

# Build the program
anchor build

# Make sure encrypted-ixs are built
cd encrypted-ixs
cargo build-sbf
cd ..
```

### Step 2: Start Arcium Localnet

```bash
# In project root
arcium localnet
```

**What this does**:
1. Starts local Solana test validator on port 8899
2. Deploys Arcium protocol program
3. Spins up 3 ARX nodes (ports 9001, 9002, 9003)
4. Forms cluster and runs DKG ceremony
5. Generates real MXE encryption keys
6. Deploys your callback program
7. Initializes MXE account properly

**Expected output**:
```
🚀 Starting Arcium Localnet...
✅ Starting Solana test validator on port 8899
✅ Deploying Arcium protocol program
✅ Starting ARX node 1 (port 9001)
✅ Starting ARX node 2 (port 9002)
✅ Starting ARX node 3 (port 9003)
✅ Forming cluster (offset: 1078779259)
✅ Running DKG ceremony...
✅ MXE keys finalized: <32-byte public key>
✅ Deploying callback program: private-markets
✅ Initializing MXE account
✅ Cluster ready for computations

Localnet running at http://localhost:8899
ARX nodes: 3 active
Press Ctrl+C to stop
```

**IMPORTANT**: Keep this terminal open! Localnet must stay running.

### Step 3: Verify MXE Initialization

Open a **new terminal**:

```bash
cd /Users/ayush/Documents/hackathons/cyberpunk

# Check MXE status (should show real keys now)
arcium mxe-info <PROGRAM_ID_FROM_LOCALNET> -u localhost

# Test MXE key
cd app
npx tsx scripts/test-mxe-key.ts

# Should now show:
# ✅ MXE Public Key retrieved:
#   Hex: <valid 32-byte key, NOT all zeros>
#   All zeros? false
# ✅ x25519 shared secret computed successfully!
```

### Step 4: Initialize Computation Definitions

```bash
cd app

# Initialize all comp defs
npx tsx scripts/init-comp-defs.ts

# Should succeed:
# ✅ private_trade computation definition initialized!
# ✅ batch_clear computation definition initialized!
# ✅ resolve_market computation definition initialized!
```

### Step 5: Update Frontend Config for Localnet

Create/update `app/.env.local`:

```bash
# Localnet configuration
NEXT_PUBLIC_NETWORK=localnet
NEXT_PUBLIC_RPC_URL=http://localhost:8899

# Program IDs (use the ones from arcium localnet output)
NEXT_PUBLIC_PROGRAM_ID=<PROGRAM_ID_FROM_LOCALNET>
NEXT_PUBLIC_ARCIUM_PROGRAM_ID=<ARCIUM_PROGRAM_ID_FROM_LOCALNET>

# Database (keep existing)
DATABASE_URL=<your_neon_db_url>
```

**OR** export environment variables:

```bash
export NEXT_PUBLIC_NETWORK=localnet
export NEXT_PUBLIC_RPC_URL=http://localhost:8899
```

### Step 6: Configure Wallet for Localnet

```bash
# Set Solana CLI to localnet
solana config set --url localhost

# Airdrop some SOL
solana airdrop 10

# Check balance
solana balance
# Should show: 10 SOL
```

### Step 7: Start Frontend

```bash
cd app

# Install dependencies if needed
npm install

# Start dev server
npm run dev
```

Frontend will run on http://localhost:3000

### Step 8: Test Full MPC Flow

1. **Open browser** to http://localhost:3000/markets
2. **Configure Phantom wallet** for localhost:
   - Settings → Network → Add Network
   - Name: Localnet
   - RPC URL: http://localhost:8899
   - Switch to Localnet
3. **Connect wallet**
4. **Create a market** (if needed):
   ```bash
   # In separate terminal
   cd app
   npx tsx scripts/create-sample-market.ts
   ```
5. **Submit a trade** through the UI

**What happens**:
```
1. Frontend encrypts order with MXE public key
2. Transaction sent to localnet
3. Program queues computation to ARX cluster
4. ARX nodes execute MPC computation
5. Callback instruction receives MPC result
6. Market state updated with encrypted execution
```

### Step 9: Monitor ARX Nodes

While testing, you can monitor:

```bash
# In another terminal
# Check computation queue
arcium mempool <MXE_ACCOUNT> -u localhost

# Check execpool
arcium execpool <MXE_ACCOUNT> -u localhost

# Check specific computation
arcium computation <COMPUTATION_ACCOUNT> -u localhost
```

## Verification Checklist

Before trading, verify:

- [ ] `arcium localnet` running (Terminal 1)
- [ ] Frontend running on port 3000 (Terminal 2)
- [ ] MXE keys NOT all zeros (check with test-mxe-key.ts)
- [ ] Wallet connected to localnet
- [ ] Wallet has SOL balance
- [ ] Computation definitions initialized

## Expected Trade Flow

### Console Output (Browser DevTools):

```
Encryption:
  ✅ Using MPC-secure encryption with real Arcium cluster

Trade Submission:
  🔍 Trade Submission Details:
    Market: <market_pubkey>
    CompDef Account: <comp_def_pubkey>
    MXE Account: <mxe_pubkey>
    Cluster Account: <cluster_pubkey>

  ✅ Transaction sent: <tx_signature>
  ✅ Trade queued to ARX cluster

ARX Execution:
  🔄 ARX nodes computing...
  ✅ MPC computation completed
  ✅ Callback executed
  ✅ Market state updated
```

### Console Output (ARX Nodes):

```
[ARX-1] Received computation request
[ARX-1] Starting MPC protocol...
[ARX-2] Participating in MPC round 1
[ARX-3] Participating in MPC round 1
[ARX-1] MPC computation complete
[ARX-1] Submitting callback transaction
✅ Callback successful
```

## Troubleshooting

### ARX Nodes Won't Start

**Error**: `Docker daemon not running`
**Solution**: Start Docker Desktop

**Error**: `Port 9001 already in use`
**Solution**: Kill existing process or change port

### MXE Keys Still All Zeros

**Cause**: DKG ceremony hasn't completed
**Solution**: Wait 30-60 seconds after localnet starts

**Check**: `arcium mxe-info <program_id> -u localhost`

### Computation Definition Init Fails

**Error**: `InvalidAuthority`
**Solution**: Make sure you're using the correct program ID from localnet output

**Error**: `Account already exists`
**Solution**: Good! Already initialized, continue

### Frontend Can't Connect

**Error**: `Failed to fetch`
**Solution**: Make sure:
1. Localnet is running
2. RPC URL is `http://localhost:8899` (not https)
3. Wallet configured for localnet

## Stopping Localnet

```bash
# In the terminal running arcium localnet
Ctrl+C

# This will:
# - Stop all ARX nodes
# - Stop Solana test validator
# - Clean up resources
```

## Switching Back to Devnet

When done testing:

```bash
# Set Solana CLI back to devnet
solana config set --url devnet

# Update frontend env
export NEXT_PUBLIC_NETWORK=devnet
export NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Or update .env.local
```

## Localnet vs Devnet Comparison

| Feature | Devnet | Localnet |
|---------|--------|----------|
| ARX Nodes | ❌ None (cluster 69069069) | ✅ 3 running locally |
| MXE Keys | ❌ All zeros | ✅ Real keys from DKG |
| Encryption | ❌ Fails | ✅ MPC-secure |
| Comp Defs | ❌ Can't initialize | ✅ Initialize successfully |
| MPC Execution | ❌ No cluster | ✅ Full MPC workflow |
| Speed | Slower (network) | Faster (local) |
| Cost | Devnet SOL | Free (local) |

## Production Deployment

After testing on localnet:

### For Hackathon Demo
- ✅ Record video of localnet MPC working
- ✅ Show encryption logs with real keys
- ✅ Demonstrate comp def initialization
- ✅ Prove true MPC integration

### For Production
Contact Arcium for:
- Mainnet cluster access
- Production ARX node setup
- Managed MPC infrastructure
- SLA guarantees

Discord: https://discord.gg/arcium
Email: support@arcium.com

## Summary

✅ **Localnet gives you**:
- Real MPC with ARX nodes
- Actual encrypted computation
- Full Arcium protocol testing
- No fallbacks, no compromises

✅ **Takes ~15 minutes** to setup

✅ **Result**: Production-quality MPC testing locally

---

**Next Command**: `arcium localnet`

Then follow steps 3-8 above.
