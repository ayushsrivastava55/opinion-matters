# Private Prediction Markets – Web App

Privacy-preserving prediction markets on Solana powered by Arcium MPC. This Next.js app displays live market data synchronized from a Neon Postgres database and enables encrypted order submission through the deployed Solana program.

## Architecture

```
On-chain Markets (Solana devnet)
    ↓ seed:markets script
Neon Postgres Database
    ↓ /api/markets endpoint
Frontend UI (Next.js + React)
    ↓ wallet + Anchor
Submit encrypted trades on-chain
```

## Key Features

- **Real-time market data** from Neon Postgres via Edge API
- **Private order submission** using Arcium MPC encryption
- **Wallet integration** with Phantom and other Solana wallets
- **CPMM pricing** with live YES/NO probability visualization
- **Responsive UI** with loading states, error handling, and refresh

## Quick Start

### 1. Install dependencies
```bash
cd app
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local` and add:
```bash
# Required: Your Neon Postgres connection string
DATABASE_URL="postgres://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb"

# Optional: Override defaults if needed
SOLANA_RPC_URL="https://api.devnet.solana.com"
PROGRAM_ID="G2jEumrainCsS2T1y6aMRgPoXw7LRygC8npNUVk8bzro"

# Optional: For wallet provider (client-side)
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
```

### 3. Seed the database

#### Option A: Seed from on-chain markets (production)
```bash
npm run seed:markets
```
This fetches all markets from the deployed Solana program and mirrors them into Neon.

#### Option B: Seed mock market (demo/testing)
```bash
npm run seed:mock
```
This creates a single demo market in Neon without requiring on-chain deployment.

### 4. Start the dev server
```bash
npm run dev
```

Visit `http://localhost:3000` for the landing page or `http://localhost:3000/markets` to see live markets.

## Available Scripts

- **`npm run dev`** - Start Next.js dev server (port 3000)
- **`npm run build`** - Build for production
- **`npm run start`** - Start production server
- **`npm run seed:markets`** - Sync on-chain markets to Neon DB
- **`npm run seed:mock`** - Insert a single mock market for demo
- **`npm run deploy:market`** - Deploy a new market on-chain (requires WALLET_KEYPAIR_PATH)

## Project Structure

```
app/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── markets/page.tsx      # Markets list + trade modal
│   │   ├── api/markets/route.ts  # Edge API endpoint
│   │   └── providers.tsx         # Wallet adapter setup
│   ├── components/
│   │   ├── wallet-button.tsx     # Connect wallet UI
│   │   ├── no-ssr.tsx           # Client-only wrapper
│   │   └── magicui/             # UI components (aurora, cards, etc.)
│   ├── lib/
│   │   ├── anchor-client.ts      # Anchor program loader with IDL fallback
│   │   ├── market-types.ts       # Shared TypeScript types
│   │   └── server/
│   │       ├── db.ts            # Neon client singleton
│   │       └── markets.ts       # DB query + mapping
│   └── idl/
│       └── private_markets.json  # Local IDL fallback
├── scripts/
│   ├── seed-markets.ts          # Sync on-chain → Neon
│   ├── seed-mock-market.ts      # Insert demo market
│   └── deploy-market.ts         # Create market on-chain
└── .env.local                   # Your secrets (gitignored)
```

## How It Works

### Data Flow
1. **Seed script** (`seed-markets.ts`) reads all markets from the on-chain program using Anchor
2. Markets are **upserted into Neon** Postgres with proper type conversions
3. **Edge API** (`/api/markets`) queries Neon and returns JSON
4. **Frontend** fetches `/api/markets`, displays cards, handles loading/error states
5. **Trade modal** submits encrypted orders via Anchor when wallet is connected

### IDL Resolution
The app tries to fetch the IDL in this order:
1. From on-chain (via `Program.fetchIdl`)
2. From local file (`app/src/idl/private_markets.json`)

If both fail, trades cannot be submitted. Ensure the IDL is published on-chain or copied locally:
```bash
# Publish IDL on-chain (one-time, after program deploy)
anchor idl init G2jEumrainCsS2T1y6aMRgPoXw7LRygC8npNUVk8bzro \
  -f target/idl/private_markets.json \
  --provider.cluster devnet

# Or copy locally
mkdir -p app/src/idl
cp ../target/idl/private_markets.json app/src/idl/private_markets.json
```

### Trade Flow
1. User clicks **"Trade now"** on a market card
2. Modal opens with YES/NO toggle and amount input
3. **Deposit** button creates ATA if needed and deposits collateral
4. **Submit trade** button:
   - Encodes order as JSON → Buffer
   - Calls `submitPrivateTrade` instruction via Anchor
   - Encrypts payload client-side (simulated; real encryption via Arcium)
   - Transaction sent to Solana devnet
5. On success, modal closes and market list refreshes

## Troubleshooting

### "DATABASE_URL is required"
- Ensure `.env.local` exists with a valid Neon connection string
- Check that the seed script is loading `.env.local` (it auto-detects this file)

### "Unable to fetch program IDL"
- Run `anchor idl init` to publish the IDL on-chain, or
- Copy `target/idl/private_markets.json` to `app/src/idl/private_markets.json`

### Markets page is empty
- Run `npm run seed:markets` to populate Neon from on-chain
- Or run `npm run seed:mock` to insert a demo market
- Check Neon console to verify the `markets` table has rows

### "This market is not deployed on-chain"
- The market exists in Neon but not on-chain (common in demo mode)
- Either deploy the market using `npm run deploy:market` or use mock mode
- In `src/lib/server/markets.ts`, the on-chain filter is currently disabled for demo

### Hydration errors
- The wallet button is wrapped in `<NoSSR>` to avoid SSR/CSR mismatches
- If you see hydration warnings, ensure all wallet-related UI is client-only

### TypeScript errors with `program.account`
- The markets page uses `(program.account as any).market.fetch()` to work around IDL type issues
- This is safe because we control the program and know the account structure

## Demo Mode vs Production Mode

### Demo Mode (current default)
- File: `src/lib/server/markets.ts`
- Returns **all markets from Neon**, even if not on-chain
- Good for showcasing UI without deploying markets
- Trade submissions will fail with "not deployed on-chain" if the market doesn't exist

### Production Mode
Uncomment lines 111-117 in `src/lib/server/markets.ts`:
```typescript
const program = await loadProgram()
const existingOnChain = new Set(
  (await program.account.market.all()).map(m => m.publicKey.toBase58())
)
return rows
  .filter(row => existingOnChain.has(row.market_public_key))
  .map(mapRowToMarket)
```
This filters to only show markets that exist on-chain, preventing trade errors.

## Tech Stack

- **Next.js 16** (React 19, App Router, Edge runtime)
- **Solana** (web3.js, wallet-adapter)
- **Anchor** (v0.30.1)
- **Neon Postgres** (serverless, edge-compatible)
- **Tailwind CSS 4** + Framer Motion
- **TypeScript 5**

## Next Steps

- [ ] Wire real Arcium MPC encryption in trade submission
- [ ] Add batch auction clearing logic
- [ ] Implement resolver staking and attestation UI
- [ ] Add market resolution and payout redemption
- [ ] Deploy to Vercel with Edge Functions
- [ ] Add wallet balance checks before deposit
- [ ] Implement 24h volume tracking with time-series data
- [ ] Add market creation UI (currently CLI-only)

## License

MIT
