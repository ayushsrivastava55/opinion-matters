import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { AnchorProvider, Wallet } from '@coral-xyz/anchor'
import { uploadCircuit } from '@arcium-hq/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

  // Load wallet
  const keypairPath = process.env.WALLET_KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'))
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData))

  // Create provider
  const provider = new AnchorProvider(
    connection,
    new Wallet(wallet),
    { commitment: 'confirmed' }
  )

  const programId = new PublicKey('7FC1PkQuAizbuWP1fXcHC4pxMsr4NmdBMkLtGnB9c6PR')

  // Circuits to upload
  const circuits = [
    { name: 'private_trade', file: 'private_trade_testnet.arcis' },
    { name: 'batch_clear', file: 'batch_clear_testnet.arcis' },
    { name: 'resolve_market', file: 'resolve_market_testnet.arcis' },
  ]

  console.log('📦 Uploading circuits to Arcium...\n')

  for (const circuit of circuits) {
    try {
      const circuitPath = path.resolve(__dirname, '../../build', circuit.file)
      console.log(`🔧 Uploading ${circuit.name}...`)
      console.log(`   File: ${circuitPath}`)

      const rawCircuit = fs.readFileSync(circuitPath)
      console.log(`   Size: ${(rawCircuit.length / 1024 / 1024).toFixed(2)} MB`)

      await uploadCircuit(
        provider,
        circuit.name,
        programId,
        rawCircuit,
        true // finalize after upload
      )

      console.log(`✅ ${circuit.name} uploaded successfully!\n`)
    } catch (error: any) {
      console.error(`❌ Failed to upload ${circuit.name}:`, error.message)
      console.error(`   Full error:`, error)
    }
  }

  console.log('🎉 All circuits uploaded!')
}

main().catch(console.error)
