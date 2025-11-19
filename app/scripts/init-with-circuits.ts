import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor'
import {
  getMXEAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
} from '@arcium-hq/client'
import fs from 'fs'

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
  const keypairPath = `${process.env.HOME}/.config/solana/id.json`
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'))
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData))
  const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: 'confirmed' })

  const PROGRAM_ID = new PublicKey('7FC1PkQuAizbuWP1fXcHC4pxMsr4NmdBMkLtGnB9c6PR')
  const ARCIUM_PROGRAM_ID = new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6')

  const idl = JSON.parse(fs.readFileSync('/Users/ayush/Documents/hackathons/cyberpunk/app/src/idl/private_markets.json', 'utf-8'))
  const program = new Program(idl, provider)

  const mxeAccount = getMXEAccAddress(PROGRAM_ID)

  console.log('Program ID:', PROGRAM_ID.toBase58())
  console.log('MXE Account:', mxeAccount.toBase58())

  // Read the compiled circuit
  const circuitPath = '/Users/ayush/Documents/hackathons/cyberpunk/build/private_trade_testnet.arcis'
  const circuitBytes = fs.readFileSync(circuitPath)
  console.log(`\nCircuit size: ${(circuitBytes.length / 1024 / 1024).toFixed(2)} MB`)

  const compDefAccount = getCompDefAccAddress(
    PROGRAM_ID,
    Buffer.from(getCompDefAccOffset('private_trade')).readUInt32LE()
  )

  console.log(`CompDef Account: ${compDefAccount.toBase58()}`)

  try {
    console.log('\n🔧 Initializing with circuit bytes...')

    // Try calling with raw circuit bytes embedded
    const tx = await program.methods
      .initPrivateTradeCompDef()
      .accounts({
        payer: wallet.publicKey,
        mxeAccount,
        compDefAccount,
        arciumProgram: ARCIUM_PROGRAM_ID,
        systemProgram: PublicKey.default,
      })
      .rpc({ commitment: 'confirmed', skipPreflight: false })

    console.log(`✅ Initialized! Tx: ${tx}`)
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message)
    if (error.logs) {
      console.error('Logs:', error.logs.slice(-5))
    }
  }
}

main().catch(console.error)
