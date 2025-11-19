# Arcium Devnet Initialization Issue

## Problem
Cannot initialize computation definitions on devnet due to `InvalidAuthority` error from Arcium program.

## Error Details
```
Program log: AnchorError thrown in programs/arcium/src/instructions/computation_definition.rs:77
Error Code: InvalidAuthority. Error Number: 6000
Error Message: The given authority is invalid.
```

## Current State
- ✅ Program deployed: `AjSL49GvLcfvarTXBcTX1fk9WqxH6LFVLpWnh8bgGtnK`
- ✅ MXE initialized: `HfXktR2XKFUnr7sL8jzn9Nzbo2Qcud73XQb6cXQknYkU`
- ✅ Cluster exists: `CaTxKKfdaoCM7ZzLj5dLzrrmnsg9GJb5iYzRzCk8VEu3` (offset: 1078779259)
- ❌ Cannot initialize comp defs

## Investigation Results

### What We Tried
1. ✅ Verified program authority matches keypair
2. ✅ Confirmed MXE has no authority (should allow anyone)
3. ✅ Verified cluster offset 1078779259 is valid devnet cluster
4. ✅ Created our own cluster (offset: 2468135790) with our authority
5. ❌ Attempted re-deployment with new cluster - MXE conflict
6. ❌ Attempted fresh deployment with new program ID - RPC rate limiting

### Analysis
The devnet cluster at offset 1078779259 appears to be a managed Arcium cluster with authority restrictions. While the MXE account itself has no authority set, the cluster account likely has an authority that controls which programs can initialize computation definitions on it.

## Solutions

### Option 1: Arcium Team Support (Recommended for Devnet)
**Contact Arcium team to:**
- Request access to initialize comp defs on their devnet cluster
- Get whitelisted/authorized for the cluster
- Or get directed to a public devnet cluster

**Steps:**
1. Join Discord: https://discord.com/invite/arcium
2. Post in #developer-support or #build-with-arcium
3. Include:
   - Program ID: `AjSL49GvLcfvarTXBcTX1fk9WqxH6LFVLpWnh8bgGtnK`
   - MXE Account: `HfXktR2XKFUnr7sL8jzn9Nzbo2Qcud73XQb6cXQknYkU`
   - Cluster Offset: 1078779259
   - Error: InvalidAuthority on init_computation_definition

### Option 2: Use Localnet (Quick Development)
Test the full MPC flow locally without devnet restrictions:

```bash
# Terminal 1: Start localnet
arcium localnet

# Terminal 2: Deploy and test
arcium test
```

This gives you:
- Full MPC functionality
- No authority restrictions
- Faster iteration
- Complete testing capability

### Option 3: Fresh Devnet Deployment (If Needed)
If you need devnet and can't get Arcium support:

1. **Get better RPC endpoint** (Helius/QuickNode for deployment)
2. **Deploy fresh:**
   ```bash
   # Generate new program keypair
   solana-keygen new -o new-program.json

   # Fund it for deployment
   solana airdrop 5 $(solana-keygen pubkey new-program.json) --url devnet
   solana airdrop 5 $(solana-keygen pubkey new-program.json) --url devnet

   # Deploy with Arcium CLI using custom cluster
   arcium deploy \\
     --program-keypair new-program.json \\
     --cluster-offset 2468135790 \\
     --keypair-path ~/.config/solana/id.json \\
     --rpc-url <YOUR_PREMIUM_RPC_URL> \\
     --program-name private_markets
   ```

3. **Update all configs** with new program ID

## Technical Details

### Arcium Architecture
```
MXE Account → Cluster Account (has authority)
    ↓              ↓
Comp Defs      MPC Nodes
```

The cluster authority controls:
- Who can initialize computation definitions
- Which programs can queue computations
- Node participation rules

### Why This Happens
Arcium devnet clusters are:
- Shared infrastructure
- Managed by Arcium team
- Require authorization to prevent abuse
- Limited capacity for testing

This is different from:
- Localnet (fully permissionless)
- Your own cluster (you control authority)

## Recommended Next Steps

### For Hackathon/Demo (Immediate)
1. **Use localnet** for development and testing
2. **Record demo** showing full MPC flow working
3. **Document devnet limitation** in README

### For Production (Post-Hackathon)
1. **Contact Arcium** for devnet/mainnet access
2. **Apply for grants** if building seriously
3. **Run own infrastructure** if needed

## Files to Update

If you switch to localnet or get new program ID:

1. `Anchor.toml` - Update program ID
2. `programs/private-markets/src/lib.rs` - Update `declare_id!()`
3. `app/src/idl/private_markets.json` - Update address
4. `app/scripts/init-comp-defs.ts` - Update PROGRAM_ID
5. `.env` files - Update NEXT_PUBLIC_PROGRAM_ID

## References
- Arcium Deployment Docs: https://docs.arcium.com/developers/deployment
- Arcium Discord: https://discord.com/invite/arcium
- Valid Devnet Cluster Offsets: 1078779259, 3726127828, 768109697

## Status
🟡 **Blocked on Arcium devnet access** - functionality complete, deployment restricted

---

**Created**: 2025-11-03
**Issue**: Computation definition initialization authority error
**Workaround**: Use localnet for testing
