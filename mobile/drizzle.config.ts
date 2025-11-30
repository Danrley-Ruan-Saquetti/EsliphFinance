import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/core/infrastructure/database/schema',
  out: './src/core/infrastructure/database/migrations',
  dialect: 'sqlite',
  driver: 'expo',
})
