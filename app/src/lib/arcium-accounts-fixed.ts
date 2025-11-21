import { 
  getMXEAccAddress, 
  getMempoolAccAddress, 
  getExecutingPoolAccAddress,
  getClockAccAddress,
  getFeePoolAccAddress,
  getClusterAccAddress,
  getComputationAccAddress,
  getCompDefAccOffset,
  getArciumProgAddress,
  getArciumAccountBaseSeed
} from '@arcium-hq/client'
import { PublicKey } from '@solana/web3.js'

const FRESH_PROGRAM_ID = new PublicKey('3HS7xQrxt6dUHPH4H9bDqvs8N7g4smRoj29ZHUtrRpz4')

// Use the cluster that actually exists
const EXISTING_CLUSTER = new PublicKey('BbRME3rksbGrBWZjiahVfyKrmwJkTa4DEjpaJZgcWRxH')

export function getCorrectClusterAccount(): PublicKey {
  return EXISTING_CLUSTER
}

export function getCorrectClockAccount(): PublicKey {
  return getClockAccAddress()
}

export function getCorrectSignAccount(): PublicKey {
  // Sign PDA derived from callback program
  const callbackProgram = new PublicKey('FxUZ9r65C8RJDSuHSmiryVWUx9ffeWAX9392iuHCxKr7')
  const seeds = [Buffer.from('SignerAccount')]
  const [signPDA] = PublicKey.findProgramAddressSync(seeds, callbackProgram)
  return signPDA
}

export function getCorrectMempoolAccount(): PublicKey {
  return getMempoolAccAddress(FRESH_PROGRAM_ID)
}

export function getCorrectExecutingPoolAccount(): PublicKey {
  return getExecutingPoolAccAddress(FRESH_PROGRAM_ID)
}

export function getCorrectFeePoolAccount(): PublicKey {
  return getFeePoolAccAddress()
}

export function getCorrectMXEAccount(): PublicKey {
  return new PublicKey('Bii4KqvczVZJiEMutjvwjp3XghezbC1F8LFqYsGM2eeE')
}

// For computation accounts, we still use SDK since they depend on computation offset
export function getComputationAccount(programId: PublicKey, computationOffset: any): PublicKey {
  return getComputationAccAddress(programId, computationOffset)
}

// For CompDef, we use manual derivation since SDK is wrong
export function getCompDefAccount(programId: PublicKey, instructionName: string): PublicKey {
  const compDefOffset = getCompDefAccOffset(instructionName)
  const arciumProgramId = getArciumProgAddress()
  const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount")
  
  return PublicKey.findProgramAddressSync(
    [baseSeed, programId.toBuffer(), compDefOffset],
    arciumProgramId
  )[0]
}

// For MXE, we use SDK since it should be correct for the program ID
export function getMXEAccount(programId: PublicKey): PublicKey {
  return getMXEAccAddress(programId)
}
