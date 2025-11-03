import { neon } from '@neondatabase/serverless'

type NeonClient = any

declare global {
  var __neonClient: NeonClient | undefined
}

export function getDb(): NeonClient {
  const url = process.env.DATABASE_URL

  if (!url) {
    console.error('DATABASE_URL environment variable is not set')
    throw new Error('Database connection unavailable. Please try again later.')
  }

  if (!globalThis.__neonClient) {
    globalThis.__neonClient = neon(url)
  }

  return globalThis.__neonClient
}
