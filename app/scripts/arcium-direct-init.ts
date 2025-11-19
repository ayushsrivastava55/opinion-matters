import { Connection, Keypair, PublicKey, SystemProgram, TransactionInstruction, Transaction } from '@solana/web3.js'
import { AnchorProvider, Wallet, BN } from '@coral-xyz/anchor'
import {
  getMXEAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getArciumProgAddress,
  getClusterAccAddress,
} from '@arcium-hq/client'
import fs from 'fs'
import * as borsh from 'borsh'

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
  const keypairPath = `${process.env.HOME}/.config/solana/id.json`
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'))
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData))
  const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: 'confirmed' })

  const PROGRAM_ID = new PublicKey('7FC1PkQuAizbuWP1fXcHC4pxMsr4NmdBMkLtGnB9c6PR')
  const ARCIUM_PROGRAM_ID = getArciumProgAddress()

  const mxeAccount = getMXEAccAddress(PROGRAM_ID)
  const clusterAccount = getClusterAccAddress(PROGRAM_ID)

  console.log('Program ID:', PROGRAM_ID.toBase58())
  console.log('MXE Account:', mxeAccount.toBase58())
  console.log('Cluster Account:', clusterAccount.toBase58())
  console.log('Payer:', wallet.publicKey.toBase58())
  console.log('Arcium Program:', ARCIUM_PROGRAM_ID.toBase58())

  // Check cluster account
  const clusterInfo = await connection.getAccountInfo(clusterAccount)
  console.log('\nCluster account exists:', !!clusterInfo)
  if (!clusterInfo) {
    console.log('❌ Cluster account not initialized! This is the issue.')
    console.log('The MXE needs to be initialized with the cluster.')
    return
  }

  // Try calling Arcium program directly
  const circuitName = 'private_trade'
  const offset = Buffer.from(getCompDefAccOffset(circuitName)).readUInt32LE()
  const compDefAccount = getCompDefAccAddress(PROGRAM_ID, offset)

  console.log(`\n🔧 Initializing ${circuitName} directly via Arcium program...`)
  console.log(`   Offset: ${offset}`)
  console.log(`   CompDef: ${compDefAccount.toBase58()}`)

  // Build the instruction manually
  // Discriminator for init_computation_definition: first 8 bytes of sha256("global:init_computation_definition")
  const discriminator = Buffer.from([0x9e, 0x2c, 0x91, 0x0f, 0x5e, 0x7c, 0xea, 0x6d])

  // Parameters: finalize_during_callback (bool), cu_amount (u64), raw_circuit (Option<Vec<u8>>), finalization_authority (Option<Pubkey>)
  const params = Buffer.concat([
    Buffer.from([1]), // finalize_during_callback = true
    Buffer.from(new BigUint64Array([BigInt(0)]).buffer), // cu_amount = 0
    Buffer.from([0]), // raw_circuit = None
    Buffer.from([0]), // finalization_authority = None
  ])

  const data = Buffer.concat([discriminator, params])

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: mxeAccount, isSigner: false, isWritable: false },
      { pubkey: compDefAccount, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: ARCIUM_PROGRAM_ID,
    data,
  })

  const tx = new Transaction().add(instruction)
  const signature = await provider.sendAndConfirm(tx, [wallet], { commitment: 'confirmed', skipPreflight: false })

  console.log(`✅ Initialized! Tx: ${signature}`)
}

main().catch(console.error)
