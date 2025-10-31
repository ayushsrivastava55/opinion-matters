import { NextResponse } from 'next/server'
import { fetchMarketsFromDb } from '@/lib/server/markets'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const markets = await fetchMarketsFromDb()
    return NextResponse.json({ markets })
  } catch (error) {
    console.error('Failed to fetch markets from Neon', error)
    return NextResponse.json({ error: 'Failed to load markets' }, { status: 500 })
  }
}
