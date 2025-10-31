import { neon } from '@neondatabase/serverless'

type NeonClient = any

declare global {
  var __neonClient: NeonClient | undefined
}

export function getDb(): NeonClient {
  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  if (!globalThis.__neonClient) {
    globalThis.__neonClient = neon(url)
  }

  return globalThis.__neonClient
}
