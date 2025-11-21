"use client"

import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor'
import { Connection, PublicKey, type Transaction } from '@solana/web3.js'
import { PROGRAM_ID } from '@/config/program'

export async function getAnchorProgram(
  connection: Connection,
  wallet: {
    publicKey: PublicKey | null
    signTransaction<T extends Transaction>(tx: T): Promise<T>
    signAllTransactions<T extends Transaction[]>(txs: T): Promise<T>
  },
): Promise<Program> {
  // Always use PROGRAM_ID from config (single source of truth)
  const programId = PROGRAM_ID
  const provider = new AnchorProvider(connection, wallet as any, {})

  // Always use local IDL to avoid DeclaredProgramIdMismatch errors
  // The on-chain IDL may have stale program ID from previous deployments
  let idl: Idl | null = null
  try {
    const localIdlModule = await import('@/idl/private_markets.json')
    idl = (localIdlModule as { default: Idl }).default || localIdlModule as any as Idl
    console.log('✅ Using local IDL with program ID:', (idl as any)?.address)
  } catch (localError) {
    console.error('Failed to load local IDL', localError)
    throw new Error('Unable to connect to the market system. Please try again later or contact support.')
  }

  // Ensure IDL has correct address (clone to avoid mutating original)
  const idlWithCorrectAddress: Idl = {
    ...idl,
    address: programId.toString()
  }

  // Create program with explicit programId parameter (Anchor v0.30+)
  return new Program(idlWithCorrectAddress, provider)
}



