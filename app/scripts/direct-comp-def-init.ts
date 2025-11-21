import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor'
import {
  getMXEAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
} from '@arcium-hq/client'
import fs from 'fs'

async function main() {
  // Setup
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
  const keypairPath = `${process.env.HOME}/.config/solana/id.json`
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'))
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData))
  const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: 'confirmed' })

  const PROGRAM_ID = new PublicKey('56vrAyPGzgoHGpiaRAsQFXjDgbcCupho1Y6rZ2Rzo6aq')
  const ARCIUM_PROGRAM_ID = new PublicKey('Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp')

  // Load program
  const idlPath = '/Users/ayush/Documents/hackathons/cyberpunk/app/src/idl/private_markets.json'
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'))
  const program = new Program(idl, provider)

  const mxeAccount = getMXEAccAddress(PROGRAM_ID)

  console.log('Program ID:', PROGRAM_ID.toBase58())
  console.log('MXE Account:', mxeAccount.toBase58())
  console.log('Payer:', wallet.publicKey.toBase58())

  // Try with explicit accounts and signers
  const circuits = ['private_trade', 'batch_clear', 'resolve_market']

  for (const circuitName of circuits) {
    try {
      console.log(`\n🔧 Initializing ${circuitName}...`)

      const compDefAccount = getCompDefAccAddress(
        PROGRAM_ID,
        Buffer.from(getCompDefAccOffset(circuitName)).readUInt32LE()
      )

      console.log(`   CompDef Account: ${compDefAccount.toBase58()}`)

      // Check if already exists
      const accountInfo = await connection.getAccountInfo(compDefAccount)
      if (accountInfo) {
        console.log(`   ✅ ${circuitName} already initialized`)
        continue
      }

      // Call the init instruction with explicit signer
      const methodName = `init${circuitName.charAt(0).toUpperCase() + circuitName.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}CompDef`

      const tx = await (program.methods as any)[methodName]()
        .accounts({
          payer: wallet.publicKey,
          mxeAccount,
          compDefAccount,
          arciumProgram: ARCIUM_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([wallet])
        .rpc({ commitment: 'confirmed', skipPreflight: false })

      console.log(`   ✅ ${circuitName} initialized! Tx: ${tx}`)
    } catch (error: any) {
      console.error(`   ❌ Failed to initialize ${circuitName}:`, error.message)
      if (error.logs) {
        console.error('   Logs:', error.logs.slice(-5))
      }
    }
  }
}

main().catch(console.error)
