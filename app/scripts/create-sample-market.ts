import 'dotenv/config'

import * as anchor from '@coral-xyz/anchor'
import { Program, type Idl, AnchorProvider, BN } from '@coral-xyz/anchor'
import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js'
import { createMint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'

async function getWalletFromDefault(): Promise<Keypair> {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const p = resolve(home, '.config/solana/id.json')
  const raw = await fs.readFile(p, 'utf8')
  const secret = Uint8Array.from(JSON.parse(raw) as number[])
  return Keypair.fromSecretKey(secret)
}

async function ensureFunds(connection: Connection, pubkey: PublicKey) {
  const bal = await connection.getBalance(pubkey)
  if (bal >= 1 * LAMPORTS_PER_SOL) return
  try {
    const sig = await connection.requestAirdrop(pubkey, 2 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction(sig, 'confirmed')
  } catch (e) {
    console.warn('Airdrop failed; continuing if wallet already funded.', e)
  }
}

async function loadProgram(connection: Connection, provider: AnchorProvider): Promise<Program> {
  // Prefer local IDL from target/idl
  const tryPaths = [
    resolve(process.cwd(), 'target/idl/private_markets.json'),
    resolve(process.cwd(), 'app/src/idl/private_markets.json'),
    resolve(process.cwd(), '../target/idl/private_markets.json'),
    resolve(process.cwd(), 'src/idl/private_markets.json'),
  ]

  let idl: Idl | null = null

  for (const p of tryPaths) {
    try {
      const raw = await fs.readFile(p, 'utf8')
      idl = JSON.parse(raw) as Idl
      break
    } catch (_) {
      // continue searching other paths
    }
  }

  if (!idl) {
    throw new Error(
      'Could not resolve IDL for private_markets program. Ensure the program is deployed (IDL on-chain) or that target/idl or src/idl contains private_markets.json.',
    )
  }

  return new Program(idl, provider)
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const connection = new Connection(rpcUrl, 'confirmed')
  const authority = await getWalletFromDefault()

  const wallet: any = {
    publicKey: authority.publicKey,
    async signTransaction<T extends anchor.web3.Transaction>(tx: T): Promise<T> {
      tx.partialSign(authority)
      return tx
    },
    async signAllTransactions<T extends anchor.web3.Transaction[]>(txs: T): Promise<T> {
      txs.forEach((tx) => tx.partialSign(authority))
      return txs
    },
  }

  const provider = new AnchorProvider(connection, wallet, {})
  anchor.setProvider(provider)

  await ensureFunds(connection, authority.publicKey)

  const program = await loadProgram(connection, provider)

  console.log('Program ID:', program.programId.toString())

  // Create collateral mint (USDC mock)
  const collateralMint = await createMint(
    connection,
    authority,
    authority.publicKey,
    null,
    6,
  )

  const question = 'Will BTC be above $90k by EOY 2025?'
  const endTime = new BN(Math.floor(Date.now() / 1000) + 86400 * 14) // 14 days
  const feeBps = 100 // 1%
  const batchInterval = new BN(3600) // 1 hour
  const resolverQuorum = 2

  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), authority.publicKey.toBuffer()],
    program.programId,
  )
  const [collateralVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), marketPda.toBuffer()],
    program.programId,
  )
  const [feeVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_vault'), marketPda.toBuffer()],
    program.programId,
  )
  const [yesMint] = PublicKey.findProgramAddressSync(
    [Buffer.from('yes_mint'), marketPda.toBuffer()],
    program.programId,
  )
  const [noMint] = PublicKey.findProgramAddressSync(
    [Buffer.from('no_mint'), marketPda.toBuffer()],
    program.programId,
  )

  const sig = await program.methods
    .createMarket(question, endTime, feeBps, batchInterval, resolverQuorum)
    .accounts({
      market: marketPda,
      collateralVault,
      feeVault,
      yesMint,
      noMint,
      collateralMint,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([authority])
    .rpc()

  console.log('Created market tx:', sig)
  console.log('Market PDA:', marketPda.toBase58())
  console.log('Collateral mint:', collateralMint.toBase58())
}

main().catch((e) => {
  console.error('Failed to create sample market', e)
  process.exit(1)
})
