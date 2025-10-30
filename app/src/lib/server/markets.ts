import { getDb } from './db'
import type { MarketRecord, MarketResolutionState } from '../market-types'

type DbMarketRow = {
  id: string
  market_public_key: string
  question: string
  description: string | null
  category: string | null
  authority: string
  end_time: string
  fee_bps: number
  yes_reserves: string
  no_reserves: string
  total_volume: string
  resolution_state: string
  created_at: string
  updated_at: string
}

const VALID_RESOLUTION_STATES: Record<MarketResolutionState, true> = {
  active: true,
  awaiting_attestation: true,
  computing: true,
  resolved_yes: true,
  resolved_no: true,
}

const isValidResolutionState = (value: string): value is MarketResolutionState =>
  value in VALID_RESOLUTION_STATES

const toResolutionState = (value: string): MarketResolutionState => {
  if (isValidResolutionState(value)) {
    return value
  }

  return 'active'
}

const toNumber = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const mapRowToMarket = (row: DbMarketRow): MarketRecord => ({
  id: row.id,
  marketPublicKey: row.market_public_key,
  question: row.question,
  description: row.description,
  category: row.category,
  authority: row.authority,
  endTime: new Date(row.end_time).toISOString(),
  feeBps: Number(row.fee_bps),
  yesReserves: toNumber(row.yes_reserves),
  noReserves: toNumber(row.no_reserves),
  totalVolume: toNumber(row.total_volume),
  resolutionState: toResolutionState(row.resolution_state),
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
})

export async function fetchMarketsFromDb(): Promise<MarketRecord[]> {
  const sql = getDb()

  const rows = await sql<DbMarketRow[]>`
    SELECT
      id,
      market_public_key,
      question,
      description,
      category,
      authority,
      end_time,
      fee_bps,
      yes_reserves,
      no_reserves,
      total_volume,
      resolution_state,
      created_at,
      updated_at
    FROM markets
    ORDER BY end_time ASC
  `

  return rows.map(mapRowToMarket)
}
