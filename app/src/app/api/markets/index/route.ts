import { NextResponse } from 'next/server'
import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, type Transaction } from '@solana/web3.js'

import { getDb } from '@/lib/server/db'

export const runtime = 'nodejs'

interface IndexMarketRequestBody {
  marketPublicKey: string
  description?: string | null
  category?: string | null
}

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
  const programIdStr = process.env.PROGRAM_ID
  if (!programIdStr) {
    throw new Error('PROGRAM_ID is not configured on the server')
  }

  const programId = new PublicKey(programIdStr)
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const connection = new Connection(rpcUrl, 'confirmed')

  const dummyWallet: {
    publicKey: PublicKey
    signTransaction<T extends Transaction>(tx: T): Promise<T>
    signAllTransactions<T extends Transaction[]>(txs: T[]): Promise<T[]>
  } = {
    publicKey: Keypair.generate().publicKey,
    async signTransaction<T extends Transaction>(tx: T): Promise<T> {
      return tx
    },
    async signAllTransactions<T extends Transaction[]>(txs: T[]): Promise<T[]> {
      return txs
    },
  }

  const provider = new AnchorProvider(connection, dummyWallet as any, {})

  let idl: Idl | null = null
  try {
    idl = await Program.fetchIdl(programId, provider)
  } catch (error) {
    console.warn('Unable to fetch IDL from chain, falling back to local file if available.', error)
  }

  if (!idl) {
    try {
      const localIdl = await import('@/idl/private_markets.json')
      idl = (localIdl as { default: Idl }).default || (localIdl as any as Idl)
    } catch (localError) {
      console.error('Could not resolve IDL for private_markets program.', localError)
      throw new Error('Could not resolve IDL for private_markets program.')
    }
  }

  const idlWithAddress: Idl = {
    ...idl,
    address: programId.toBase58(),
  }

  return new Program(idlWithAddress, provider)
}

async function ensureMarketsTable() {
  const sql = getDb()
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IndexMarketRequestBody

    if (!body || typeof body.marketPublicKey !== 'string' || body.marketPublicKey.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or invalid marketPublicKey' }, { status: 400 })
    }

    const marketPk = new PublicKey(body.marketPublicKey)

    const program = await loadProgram()
    let account: MarketAccount
    try {
      account = (await program.account.market.fetch(marketPk)) as unknown as MarketAccount
    } catch (error) {
      console.error('Failed to fetch market from program', error)
      return NextResponse.json({ error: 'Market not found on-chain' }, { status: 404 })
    }

    const endTime = toDate(account.endTime)
    const resolutionState = toResolutionStateString(account.resolutionState)

    await ensureMarketsTable()
    const sql = getDb()

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
        ${marketPk.toBase58()},
        ${account.question},
        ${body.description ?? null},
        ${body.category ?? null},
        ${account.authority.toBase58()},
        ${endTime.toISOString()},
        ${Number(account.feeBps)},
        ${account.yesReserves.toString()},
        ${account.noReserves.toString()},
        ${account.totalVolume.toString()},
        ${resolutionState},
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

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('Failed to index market', error)
    return NextResponse.json({ error: 'Failed to index market' }, { status: 500 })
  }
}
