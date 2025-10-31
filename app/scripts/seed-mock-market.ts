import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { neon } from '@neondatabase/serverless'
import { Keypair } from '@solana/web3.js'

// Load .env.local first, else .env
(() => {
  const cwd = process.cwd()
  const localPath = resolve(cwd, '.env.local')
  const defaultPath = resolve(cwd, '.env')
  loadEnv({ path: existsSync(localPath) ? localPath : defaultPath })
})()

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`
  await sql`
    CREATE TABLE IF NOT EXISTS markets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      market_public_key TEXT UNIQUE NOT NULL,
      question TEXT NOT NULL,
      description TEXT,
      category TEXT,
      authority TEXT NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      fee_bps INTEGER NOT NULL,
      yes_reserves NUMERIC NOT NULL,
      no_reserves NUMERIC NOT NULL,
      total_volume NUMERIC NOT NULL,
      resolution_state TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required to seed mock market')
  const sql = neon(databaseUrl)
  await ensureTable(sql)

  const marketPubkey = Keypair.generate().publicKey.toBase58()
  const authority = Keypair.generate().publicKey.toBase58()
  const endTime = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days

  const question = 'Will the BTC ETF see >$5B daily volume this month?'

  await sql`
    INSERT INTO markets (
      market_public_key,
      question,
      description,
      category,
      authority,
      end_time,
      fee_bps,
      yes_reserves,
      no_reserves,
      total_volume,
      resolution_state,
      updated_at
    ) VALUES (
      ${marketPubkey},
      ${question},
      ${'Demo market seeded without on-chain mirror'},
      ${'macro'},
      ${authority},
      ${endTime.toISOString()},
      ${100},
      ${500000},
      ${450000},
      ${3250000},
      ${'active'},
      NOW()
    )
    ON CONFLICT (market_public_key) DO UPDATE SET
      question = EXCLUDED.question,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      authority = EXCLUDED.authority,
      end_time = EXCLUDED.end_time,
      fee_bps = EXCLUDED.fee_bps,
      yes_reserves = EXCLUDED.yes_reserves,
      no_reserves = EXCLUDED.no_reserves,
      total_volume = EXCLUDED.total_volume,
      resolution_state = EXCLUDED.resolution_state,
      updated_at = NOW()
  `

  console.log('Seeded mock market into Neon: ', marketPubkey)
}

main().catch((e) => {
  console.error('Failed to seed mock market', e)
  process.exit(1)
})

