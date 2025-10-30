import 'dotenv/config'

import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor'
import { neon } from '@neondatabase/serverless'
import { Keypair, PublicKey, Connection, type Transaction } from '@solana/web3.js'

type ResolutionState =
  | { active: Record<string, never> }
  | { awaitingAttestation: Record<string, never> }
  | { computing: Record<string, never> }
  | { resolved: { finalOutcome: number } }

type MarketAccount = {
  authority: PublicKey
  question: string
  endTime: { toString(): string }
  feeBps: number
  resolutionState: ResolutionState
  yesReserves: { toString(): string }
  noReserves: { toString(): string }
  totalVolume: { toString(): string }
}

type MarketAccountResponse = {
  publicKey: PublicKey
  account: MarketAccount
}

const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID ?? 'G2jEumrainCsS2T1y6aMRgPoXw7LRygC8npNUVk8bzro',
)

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'

const toResolutionStateString = (state: ResolutionState): string => {
  if ('resolved' in state) {
    return state.resolved.finalOutcome === 1 ? 'resolved_yes' : 'resolved_no'
  }
  if ('computing' in state) return 'computing'
  if ('awaitingAttestation' in state) return 'awaiting_attestation'
  return 'active'
}

const toDate = (value: { toString(): string }) => {
  const seconds = Number.parseInt(value.toString(), 10)
  if (Number.isNaN(seconds)) return new Date()
  return new Date(seconds * 1000)
}

async function loadProgram(): Promise<Program> {
  const connection = new Connection(RPC_URL, 'confirmed')
  const dummyWallet: {
    publicKey: PublicKey
    signTransaction<T extends Transaction>(tx: T): Promise<T>
    signAllTransactions<T extends Transaction[]>(txs: T): Promise<T>
  } = {
    publicKey: Keypair.generate().publicKey,
    async signTransaction<T extends Transaction>(tx: T) {
      return tx
    },
    async signAllTransactions<T extends Transaction[]>(txs: T) {
      return txs
    },
  }

  const provider = new AnchorProvider(connection, dummyWallet, {})
  let idl: Idl | null = null

  try {
    idl = await Program.fetchIdl(PROGRAM_ID, provider)
  } catch (error) {
    console.warn('Unable to fetch IDL from chain, falling back to local file if available.', error)
  }

  if (!idl) {
    try {
      const localIdl = await import('../idl/private_markets.json')
      idl = (localIdl as { default: Idl }).default
    } catch (localError) {
      console.error('Could not resolve IDL for private_markets program.', localError)
      throw new Error('Could not resolve IDL for private_markets program.')
    }
  }

  return new Program(idl, PROGRAM_ID, provider)
}

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

async function seed() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to seed markets.')
  }

  const sql = neon(databaseUrl)
  await ensureTable(sql)

  const program = await loadProgram()
  console.log('Fetching markets from program', PROGRAM_ID.toBase58())
  const markets = (await program.account.market.all()) as MarketAccountResponse[]

  if (markets.length === 0) {
    console.log('No on-chain markets found. Nothing to seed.')
    return
  }

  let upserted = 0

  for (const market of markets) {
    const endTime = toDate(market.account.endTime)

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
        ${market.publicKey.toBase58()},
        ${market.account.question},
        NULL,
        NULL,
        ${market.account.authority.toBase58()},
        ${endTime.toISOString()},
        ${Number(market.account.feeBps)},
        ${market.account.yesReserves.toString()},
        ${market.account.noReserves.toString()},
        ${market.account.totalVolume.toString()},
        ${toResolutionStateString(market.account.resolutionState)},
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

    upserted += 1
  }

  console.log(`Seeded ${upserted} market${upserted === 1 ? '' : 's'} into Neon.`)
}

seed().catch((error) => {
  console.error('Failed to seed markets', error)
  process.exit(1)
})
