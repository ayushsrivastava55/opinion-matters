import 'dotenv/config'

import * as anchor from '@coral-xyz/anchor'
import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import {
  getMXEAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getClusterAccAddress,
} from '@arcium-hq/client'

async function getWalletFromDefault(): Promise<Keypair> {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const p = resolve(home, '.config/solana/id.json')
  const raw = await fs.readFile(p, 'utf8')
  const secret = Uint8Array.from(JSON.parse(raw) as number[])
  return Keypair.fromSecretKey(secret)
}

async function loadProgram(connection: Connection, provider: AnchorProvider): Promise<Program> {
  // Try multiple possible IDL locations
  const possiblePaths = [
    resolve(process.cwd(), 'target/idl/private_markets.json'),
    resolve(process.cwd(), '../target/idl/private_markets.json'),
    resolve(process.cwd(), 'src/idl/private_markets.json'),
    resolve(process.cwd(), 'app/src/idl/private_markets.json'),
  ]
  
  // Correct program ID for the deployed program
  const PROGRAM_ID = new PublicKey('AjSL49GvLcfvarTXBcTX1fk9WqxH6LFVLpWnh8bgGtnK')
  
  for (const idlPath of possiblePaths) {
    try {
      const raw = await fs.readFile(idlPath, 'utf8')
      const idl = JSON.parse(raw) as Idl
      // Ensure the IDL has the correct program address
      idl.address = PROGRAM_ID.toString()
      return new Program(idl, provider)
    } catch (err) {
      // Try next path
      continue
    }
  }
  
  throw new Error(`Could not find IDL file. Tried: ${possiblePaths.join(', ')}`)
}

function getOffsetU32(name: 'private_trade' | 'batch_clear' | 'resolve_market'): number {
  // SDK returns a little-endian buffer; convert to number consistently with frontend
  const buf = Buffer.from(getCompDefAccOffset(name))
  return buf.readUInt32LE(0)
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const connection = new Connection(rpcUrl, 'confirmed')
  const authority = await getWalletFromDefault()

  const wallet = {
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

  const provider = new AnchorProvider(connection, wallet as any, {})
  anchor.setProvider(provider)

  const program = await loadProgram(connection, provider)
  const programId = program.programId
  const arciumProgramId = new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6')

  const mxeAccount = getMXEAccAddress(programId)
  const CLUSTER_OFFSET = 1078779259  // From devnet MXE initialization
  const clusterAccount = getClusterAccAddress(CLUSTER_OFFSET)
  const privateTradeCompDef = getCompDefAccAddress(programId, getOffsetU32('private_trade'))
  const batchClearCompDef = getCompDefAccAddress(programId, getOffsetU32('batch_clear'))
  const resolveMarketCompDef = getCompDefAccAddress(programId, getOffsetU32('resolve_market'))

  console.log('Program ID:', programId.toBase58())
  console.log('MXE Account:', mxeAccount.toBase58())
  console.log('Cluster Account:', clusterAccount.toBase58())
  console.log('Payer/Authority:', authority.publicKey.toBase58())
  console.log('CompDef (private_trade):', privateTradeCompDef.toBase58())
  console.log('CompDef (batch_clear):', batchClearCompDef.toBase58())
  console.log('CompDef (resolve_market):', resolveMarketCompDef.toBase58())
  
  console.log('\n⚠️  Note: If you get "InvalidAuthority" errors, ensure:')
  console.log('   1. The program has been rebuilt with latest changes (anchor build)')
  console.log('   2. The program has been redeployed')
  console.log('   3. The MXE was initialized with the same keypair used here')

  // Check MXE account authority
  try {
    const mxeInfo = await connection.getAccountInfo(mxeAccount)
    if (mxeInfo) {
      // MXE account exists - try to decode it to check authority
      // The MXE account structure has authority as Option<Pubkey> at offset 8 (after discriminator + authority Option tag)
      const data = mxeInfo.data
      if (data.length >= 8) {
        // Check if authority is Some (1) or None (0)
        const authorityFlag = data[8] // Option<Pubkey> starts after 8-byte discriminator
        if (authorityFlag === 1 && data.length >= 40) {
          // Authority is Some - extract it
          const authorityBytes = data.slice(9, 9 + 32)
          const mxeAuthority = new PublicKey(authorityBytes)
          console.log('\n⚠️  MXE Account has authority set to:', mxeAuthority.toBase58())
          console.log('   Current payer:', authority.publicKey.toBase58())
          if (!mxeAuthority.equals(authority.publicKey)) {
            console.error('\n❌ ERROR: MXE account authority does not match payer!')
            console.error('   You must use the MXE authority keypair to initialize computation definitions.')
            console.error('   MXE Authority:', mxeAuthority.toBase58())
            console.error('   Current Payer:', authority.publicKey.toBase58())
            process.exit(1)
          }
        } else {
          console.log('\n✅ MXE Account has no authority (None) - any payer can initialize')
        }
      }
    } else {
      console.error('\n❌ ERROR: MXE account does not exist!')
      console.error('   Run: arcium init-mxe --callback-program', programId.toBase58(), '--cluster-offset 1078779259')
      process.exit(1)
    }
  } catch (error: any) {
    console.warn('Could not check MXE account authority:', error.message)
  }

  // Initialize accounts sequentially (one at a time for better error handling)
  console.log('\n📝 Initializing computation definitions...\n')

  // Check if already initialized first
  const checkAndInit = async (
    name: string,
    compDefPda: PublicKey,
    initMethod: () => Promise<string>
  ) => {
    try {
      const accountInfo = await connection.getAccountInfo(compDefPda)
      if (accountInfo && accountInfo.data.length > 0) {
        console.log(`✅ ${name} already initialized, skipping...`)
        return null
      }
    } catch (e) {
      // Account doesn't exist, proceed
    }
    
    try {
      console.log(`🔧 Initializing ${name}...`)
      const tx = await initMethod()
      console.log(`   ✅ ${name} initialized! Tx: ${tx}`)
      return tx
    } catch (error: any) {
      console.error(`   ❌ Failed to initialize ${name}:`, error.message || error)
      if (error.logs) {
        console.error('   Logs:', error.logs.join('\n'))
      }
      throw error
    }
  }

  try {
    // Include all accounts explicitly as defined in IDL
    // Even though arcium_program and system_program have fixed addresses,
    // explicitly passing them ensures proper account resolution
    await checkAndInit(
      'private_trade',
      privateTradeCompDef,
      () =>
        program.methods
          .initPrivateTradeCompDef()
          .accounts({
            payer: authority.publicKey,
            mxeAccount,
            compDefAccount: privateTradeCompDef,
            arciumProgram: arciumProgramId,
            systemProgram: SystemProgram.programId,
          })
          .signers([authority])
          .rpc({
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
          })
    )

    await checkAndInit(
      'batch_clear',
      batchClearCompDef,
      () =>
        program.methods
          .initBatchClearCompDef()
          .accounts({
            payer: authority.publicKey,
            mxeAccount,
            compDefAccount: batchClearCompDef,
            arciumProgram: arciumProgramId,
            systemProgram: SystemProgram.programId,
          })
          .signers([authority])
          .rpc({
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
          })
    )

    await checkAndInit(
      'resolve_market',
      resolveMarketCompDef,
      () =>
        program.methods
          .initResolveMarketCompDef()
          .accounts({
            payer: authority.publicKey,
            mxeAccount,
            compDefAccount: resolveMarketCompDef,
            arciumProgram: arciumProgramId,
            systemProgram: SystemProgram.programId,
          })
          .signers([authority])
          .rpc({
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
          })
    )

    console.log('\n✅ All computation definitions initialized successfully!')
  } catch (error: any) {
    console.error('\n❌ Failed to initialize computation definitions:', error.message || error)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('Failed to initialize computation definitions', e)
  process.exit(1)
})


