export type MarketResolutionState =
  | 'active'
  | 'awaiting_attestation'
  | 'computing'
  | 'resolved_yes'
  | 'resolved_no'

export interface MarketRecord {
  id: string
  marketPublicKey: string
  question: string
  description: string | null
  category: string | null
  authority: string
  endTime: string
  feeBps: number
  yesReserves: number
  noReserves: number
  totalVolume: number
  resolutionState: MarketResolutionState
  createdAt: string
  updatedAt: string
}
