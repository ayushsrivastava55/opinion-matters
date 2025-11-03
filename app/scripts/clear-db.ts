import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Load environment variables
(() => {
  const cwd = process.cwd()
  const localPath = resolve(cwd, '.env.local')
  const defaultPath = resolve(cwd, '.env')
  const path = existsSync(localPath) ? localPath : defaultPath
  loadEnv({ path })
})()

import { neon } from '@neondatabase/serverless'

async function clearDatabase() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to clear the database.')
  }

  const sql = neon(databaseUrl)

  console.log('🗑️  Clearing markets table...')

  const result = await sql`TRUNCATE TABLE markets CASCADE`

  console.log('✅ Markets table cleared successfully!')
  console.log('   All market records have been removed.')
}

clearDatabase().catch((error) => {
  console.error('❌ Failed to clear database:', error)
  process.exit(1)
})
