"use client"

import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor'
import { Connection, PublicKey, type Transaction } from '@solana/web3.js'

export async function getAnchorProgram(
  connection: Connection,
  wallet: {
    publicKey: PublicKey | null
    signTransaction<T extends Transaction>(tx: T): Promise<T>
    signAllTransactions<T extends Transaction[]>(txs: T): Promise<T>
  },
): Promise<Program> {
  const programIdStr =
    process.env.NEXT_PUBLIC_PROGRAM_ID || process.env.PROGRAM_ID || 'G2jEumrainCsS2T1y6aMRgPoXw7LRygC8npNUVk8bzro'

  const programId = new PublicKey(programIdStr)
  const provider = new AnchorProvider(connection, wallet as any, {})

  let idl: Idl | null = null
  try {
    idl = await Program.fetchIdl(programId, provider)
  } catch (e) {
    console.warn('Failed to fetch IDL from chain, trying local fallback...', e)
  }
  
  if (!idl) {
    try {
      const localIdl = await import('@/idl/private_markets.json')
      idl = (localIdl as { default: Idl }).default
    } catch (localError) {
      console.error('Failed to load local IDL', localError)
      throw new Error('Unable to fetch program IDL. Ensure the program is deployed and IDL is initialized, or place the IDL at app/src/idl/private_markets.json')
    }
  }

  return new Program(idl, provider)
}

