import { NextResponse } from 'next/server'
import { AnchorProvider, Program, BN, type Idl } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, type Transaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { readFileSync } from 'node:fs'

import { getDb } from '@/lib/server/db'

export const runtime = 'nodejs'

interface CreateMarketRequestBody {
  question: string
  endTimeIso: string
  description?: string | null
  category?: string | null
  feeBps?: number
  batchIntervalSec?: number
  resolverQuorum?: number
}

async function loadProgram(connection: Connection, wallet: Keypair, programId: PublicKey): Promise<Program> {
  const walletAdapter = {
    publicKey: wallet.publicKey,
    async signTransaction(tx: Transaction): Promise<Transaction> {
      tx.sign(wallet)
      return tx
    },
    async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
      txs.forEach((tx) => tx.sign(wallet))
      return txs
    },
  }

  const provider = new AnchorProvider(connection, walletAdapter as any, { commitment: 'confirmed' })

  let idl: Idl | null = null
  try {
    idl = await Program.fetchIdl(programId, provider)
  } catch (error) {
    console.warn('Unable to fetch IDL from chain, falling back to local file...', error)
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

function getWalletFromEnv(): Keypair {
  const keypairPath = process.env.WALLET_KEYPAIR_PATH
  if (!keypairPath) {
    throw new Error('WALLET_KEYPAIR_PATH must be set in the server environment to create markets')
  }

  const raw = readFileSync(keypairPath, 'utf8')
  const secret = Uint8Array.from(JSON.parse(raw) as number[])
  return Keypair.fromSecretKey(secret)
}

function deriveMarketPda(authority: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('market', 'utf8'), authority.toBuffer()], programId)
  return pda
}

function deriveCollateralVaultPda(market: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('vault', 'utf8'), market.toBuffer()], programId)
  return pda
}

function deriveFeeVaultPda(market: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('fee_vault', 'utf8'), market.toBuffer()], programId)
  return pda
}

function deriveOutcomeMints(market: PublicKey, programId: PublicKey): { yesMint: PublicKey; noMint: PublicKey } {
  const [yesMint] = PublicKey.findProgramAddressSync([Buffer.from('yes_mint', 'utf8'), market.toBuffer()], programId)
  const [noMint] = PublicKey.findProgramAddressSync([Buffer.from('no_mint', 'utf8'), market.toBuffer()], programId)
  return { yesMint, noMint }
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
    const body = (await req.json()) as CreateMarketRequestBody

    if (!body || typeof body.question !== 'string' || body.question.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or invalid market question' }, { status: 400 })
    }

    if (!body.endTimeIso || typeof body.endTimeIso !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid endTimeIso' }, { status: 400 })
    }

    const endTime = new Date(body.endTimeIso)
    if (Number.isNaN(endTime.getTime())) {
      return NextResponse.json({ error: 'endTimeIso must be a valid date string' }, { status: 400 })
    }

    const programIdStr = process.env.PROGRAM_ID
    if (!programIdStr) {
      return NextResponse.json({ error: 'PROGRAM_ID is not configured on the server' }, { status: 500 })
    }

    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    const programId = new PublicKey(programIdStr)

    // Blockchain-grade connection configuration
    const connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30000, // 30 seconds - standard block time
      httpHeaders: {
        'Content-Type': 'application/json',
        'User-Agent': 'Arcium-PrivateMarkets/1.0.0'
      }
    })

    const wallet = getWalletFromEnv()
    const program = await loadProgram(connection, wallet, programId)

    const market = deriveMarketPda(wallet.publicKey, program.programId)
    const collateralVault = deriveCollateralVaultPda(market, program.programId)
    const feeVault = deriveFeeVaultPda(market, program.programId)
    const { yesMint, noMint } = deriveOutcomeMints(market, program.programId)

    const feeBps = typeof body.feeBps === 'number' && Number.isFinite(body.feeBps)
      ? Math.max(0, Math.min(10_000, Math.floor(body.feeBps)))
      : Number(process.env.MARKET_FEE_BPS ?? 100)

    const batchIntervalSec = typeof body.batchIntervalSec === 'number' && Number.isFinite(body.batchIntervalSec)
      ? Math.max(60, Math.floor(body.batchIntervalSec))
      : Number(process.env.MARKET_BATCH_INTERVAL ?? 300)

    const resolverQuorum = typeof body.resolverQuorum === 'number' && Number.isFinite(body.resolverQuorum)
      ? Math.max(1, Math.min(10, Math.floor(body.resolverQuorum)))
      : Number(process.env.MARKET_RESOLVER_QUORUM ?? 3)

    const collateralMint = process.env.COLLATERAL_MINT
      ? new PublicKey(process.env.COLLATERAL_MINT)
      : new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU') // USDC devnet

    const endTimeSeconds = Math.floor(endTime.getTime() / 1000)

    const txSig = await program.methods
      .createMarket(
        body.question,
        new BN(endTimeSeconds),
        feeBps,
        new BN(batchIntervalSec),
        resolverQuorum,
      )
      .accounts({
        market,
        collateralVault,
        feeVault,
        yesMint,
        noMint,
        collateralMint,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc()

    // Upsert into Neon so the market immediately appears in /markets
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
        ${market.toBase58()},
        ${body.question},
        ${body.description ?? null},
        ${body.category ?? null},
        ${wallet.publicKey.toBase58()},
        ${endTime.toISOString()},
        ${feeBps},
        ${0},
        ${0},
        ${0},
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

    return NextResponse.json(
      {
        ok: true,
        txSig,
        marketPublicKey: market.toBase58(),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Failed to create market', error)
    return NextResponse.json({ error: 'Failed to create market' }, { status: 500 })
  }
}
