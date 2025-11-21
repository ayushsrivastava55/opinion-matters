import { NextResponse } from 'next/server'
import { getDb } from '@/lib/server/db'

export const runtime = 'nodejs'

export async function DELETE() {
  try {
    const sql = getDb()
    
    // Clear all markets from the database
    await sql`DELETE FROM markets`
    
    return NextResponse.json({ 
      message: 'All markets cleared from database',
      timestamp: new Date().toISOString()
    }, { status: 200 })
  } catch (error) {
    console.error('Failed to clear markets', error)
    return NextResponse.json({ error: 'Failed to clear markets' }, { status: 500 })
  }
}
