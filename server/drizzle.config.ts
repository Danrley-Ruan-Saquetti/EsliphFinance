import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set to run Drizzle Kit')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infra/database/drizzle/schemas/index.ts',
  out: './src/infra/database/drizzle/migrations',
  dbCredentials: {
    url: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true',
  },
  strict: true,
  verbose: true,
})
