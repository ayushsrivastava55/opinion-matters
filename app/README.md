# Opinion Matters – Web App

This Next.js app renders live prediction-market data that is synchronized from a Neon Postgres database. The project now
includes:

- A `/api/markets` endpoint that serves market data straight from Neon.
- Client-side rendering that streams the Neon data with lightweight skeletons to improve perceived performance.
- A `seed:markets` script that copies on-chain markets from the deployed Solana program into Neon, so nothing relies on
  mock data.

## Getting started

```bash
cd app
npm install
cp .env.example .env.local
# Fill DATABASE_URL with your Neon connection string
npm run seed:markets
npm run dev
```

The seeding command talks to Solana devnet (override `SOLANA_RPC_URL` if you have a private RPC) and mirrors the markets
into Neon. The markets page automatically reads from the same database via the `/api/markets` route.
