import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'

import { env } from '@shared/env'

const expoDb = openDatabaseSync(env.DATABASE_NAME)
export const db = drizzle(expoDb, { casing: 'snake_case' })
