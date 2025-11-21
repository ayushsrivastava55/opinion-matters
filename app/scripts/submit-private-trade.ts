import 'dotenv/config'

import { AnchorProvider, Program, type Idl, BN, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import {
  getArciumAccountBaseSeed,
  getArciumProgAddress,
  getComputationAccAddress,
  getCompDefAccOffset,
  getFeePoolAccAddress,
} from '@arcium-hq/client'
import {
  PROGRAM_ID,
  MXE_ACCOUNT,
  ARCIUM_CLUSTER_OFFSET,
  deriveSignPda,
} from '../src/config/program'
import {
  getCorrectClusterAccount,
  getCorrectClockAccount,
  getCorrectSignPda,
  getCorrectMempoolAccount,
  getCorrectExecutingPool,
  getCorrectFeePool,
  getCompDefAccount,
  getComputationAccount,
  getMXEAccount
} from '../src/lib/arcium-accounts-fixed'

async function getWalletFromDefault(): Promise<Keypair> {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const p = resolve(home, '.config/solana/id.json')
  const raw = await fs.readFile(p, 'utf8')
  const secret = Uint8Array.from(JSON.parse(raw) as number[])
  return Keypair.fromSecretKey(secret)
}

async function loadIdl(): Promise<Idl> {
  const tryPaths = [
    resolve(process.cwd(), 'target/idl/private_markets.json'),
    resolve(process.cwd(), 'app/src/idl/private_markets.json'),
    resolve(process.cwd(), '../target/idl/private_markets.json'),
  ]
  for (const path of tryPaths) {
    try {
      const raw = await fs.readFile(path, 'utf8')
      return JSON.parse(raw) as Idl
    } catch (_) {}
  }
  throw new Error('Unable to locate private_markets IDL. Run `anchor build` first.')
}

function randomBytes32() {
  return Array.from(randomBytes(32))
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'http://localhost:8899'
  const marketPubkey = new PublicKey(
    process.env.MARKET || '75DjrupV1SGCvD6tYRyWvPGZQPy8h2kcSg1bDGHxMUsD',
  )

  const connection = new Connection(rpcUrl, 'confirmed')
  const wallet = await getWalletFromDefault()
  const provider = new AnchorProvider(connection, new Wallet(wallet), {})
  const idl = await loadIdl()
  const program = new Program(idl, provider)

  const signPda = getCorrectSignPda()
  const mempoolAccount = getCorrectMempoolAccount()
  const executingPool = getCorrectExecutingPool()
  const computationOffset = new BN(Date.now() % 10_000_000)
  const computationAccount = getComputationAccount(PROGRAM_ID, computationOffset)
  const compDefAccount = getCompDefAccount(PROGRAM_ID, 'private_trade')
  const clusterAccount = getCorrectClusterAccount()
  const clockAccount = getCorrectClockAccount()
  const feePoolAccount = getCorrectFeePool()

  const ciphertextAmount = randomBytes32()
  const ciphertextSide = randomBytes32()
  const ciphertextMaxPrice = randomBytes32()
  const nonceBn = new BN(randomBytes(16), 'le')
  const clientPubkey = randomBytes32()

  console.log('Submitting trade to market', marketPubkey.toBase58())

  const sig = await program.methods
    .submitPrivateTrade(
      computationOffset,
      ciphertextAmount,
      ciphertextSide,
      ciphertextMaxPrice,
      nonceBn,
      clientPubkey,
    )
    .accounts({
      payer: wallet.publicKey,
      signPdaAccount: signPda,
      mxeAccount: MXE_ACCOUNT,
      mempoolAccount,
      executingPool,
      computationAccount,
      compDefAccount,
      clusterAccount,
      poolAccount: feePoolAccount,
      clockAccount,
      systemProgram: SystemProgram.programId,
      arciumProgram: getArciumProgAddress(),
      market: marketPubkey,
    })
    .signers([wallet])
    .rpc()

  console.log('Trade transaction signature:', sig)
}

main().catch((err) => {
  console.error('Failed to submit trade', err)
  process.exit(1)
})
