import 'dotenv/config'

import { AnchorProvider, Program, type Idl, BN } from '@coral-xyz/anchor'
import { Keypair, PublicKey, Connection, SystemProgram, SYSVAR_RENT_PUBKEY, type Transaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID ?? 'G2jEumrainCsS2T1y6aMRgPoXw7LRygC8npNUVk8bzro',
)

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'

async function loadProgram(connection: Connection, wallet: Keypair) {
  const walletAdapter = {
    publicKey: wallet.publicKey,
    signTransaction: async (tx: Transaction) => {
      tx.sign(wallet)
      return tx
    },
    signAllTransactions: async (txs: Transaction[]) => {
      txs.forEach(tx => tx.sign(wallet))
      return txs
    },
  }
  
  const provider = new AnchorProvider(connection, walletAdapter as any, { commitment: 'confirmed' })
  let idl: Idl | null = null

  try {
    console.log('Fetching IDL from on-chain...')
    idl = await Program.fetchIdl(PROGRAM_ID, provider)
    if (idl) console.log('✅ IDL fetched from on-chain')
  } catch (error) {
    console.warn('Unable to fetch IDL from chain, falling back to local file...')
  }

  if (!idl) {
    try {
      console.log('Loading local IDL fallback...')
      const localIdl = await import('../src/idl/private_markets.json')
      idl = (localIdl as { default: Idl }).default
      console.log('✅ Local IDL loaded')
    } catch (localError) {
      console.error('Could not resolve IDL for private_markets program.', localError)
      throw new Error('Could not resolve IDL for private_markets program.')
    }
  }

  return new Program(idl, provider)
}

async function deriveMarketAddress(authority: PublicKey): Promise<[PublicKey, number]> {
  const marketSeed = Buffer.from('market', 'utf8')
  return PublicKey.findProgramAddress([marketSeed, authority.toBuffer()], PROGRAM_ID)
}

async function deriveCollateralVault(market: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress([Buffer.from('vault', 'utf8'), market.toBuffer()], PROGRAM_ID)
}

async function deriveFeeVault(market: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress([Buffer.from('fee_vault', 'utf8'), market.toBuffer()], PROGRAM_ID)
}

async function deriveMints(market: PublicKey): Promise<[PublicKey, PublicKey, number]> {
  const [yesMint, yesBump] = await PublicKey.findProgramAddress([Buffer.from('yes_mint', 'utf8'), market.toBuffer()], PROGRAM_ID)
  const [noMint, noBump] = await PublicKey.findProgramAddress([Buffer.from('no_mint', 'utf8'), market.toBuffer()], PROGRAM_ID)
  return [yesMint, noMint, yesBump]
}

async function deploy() {
  const keypairPath = process.env.WALLET_KEYPAIR_PATH
  if (!keypairPath) {
    throw new Error('Set WALLET_KEYPAIR_PATH in .env.local to a keypair file that can deploy markets.')
  }
  
  console.log('Loading wallet from:', keypairPath)
  const secretKey = Uint8Array.from(JSON.parse(require('fs').readFileSync(keypairPath, 'utf8')))
  const wallet = Keypair.fromSecretKey(secretKey)
  console.log('Wallet loaded:', wallet.publicKey.toBase58())

  const connection = new Connection(RPC_URL, 'confirmed')
  const program = await loadProgram(connection, wallet)

  const question = process.env.MARKET_QUESTION ?? 'Will Bitcoin hit $100k by December 2024?'
  const endTime = process.env.MARKET_END_TIME ? new Date(process.env.MARKET_END_TIME) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const feeBps = Number(process.env.MARKET_FEE_BPS ?? 100)
  const batchInterval = Number(process.env.MARKET_BATCH_INTERVAL ?? 300)
  const resolverQuorum = Number(process.env.MARKET_RESOLVER_QUORUM ?? 3)
  
  // Use USDC devnet mint as collateral (or set via env)
  const collateralMint = process.env.COLLATERAL_MINT 
    ? new PublicKey(process.env.COLLATERAL_MINT)
    : new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU') // USDC devnet

  const [marketAddress, marketBump] = await deriveMarketAddress(wallet.publicKey)
  const [collateralVault, _] = await deriveCollateralVault(marketAddress)
  const [feeVault, __] = await deriveFeeVault(marketAddress)
  const [yesMint, noMint, ___] = await deriveMints(marketAddress)

  console.log('\n🚀 Creating market...')
  console.log('Question:', question)
  console.log('End time:', endTime.toISOString())
  console.log('Market address (derived):', marketAddress.toBase58())
  console.log('Fee:', feeBps, 'bps')
  
  const tx = await program.methods
    .createMarket(
      question,
      new BN(Math.floor(endTime.getTime() / 1000)), // i64 needs BN
      feeBps,                                          // u16 is fine as number
      new BN(batchInterval),                          // i64 needs BN
      resolverQuorum,                                 // u8 is fine as number
    )
    .accounts({
      market: marketAddress,
      authority: wallet.publicKey,
      collateralVault,
      feeVault,
      yesMint,
      noMint,
      collateralMint,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc()

  console.log('\n✅ Market created successfully!')
  console.log('Market public key:', marketAddress.toBase58())
  console.log('Transaction signature:', tx)
  console.log('\n📝 Next steps:')
  console.log('1. Run: npm run seed:markets')
  console.log('2. Visit /markets to see your new market')
}

deploy().catch((error) => {
  console.error('Failed to deploy market', error)
  process.exit(1)
})
