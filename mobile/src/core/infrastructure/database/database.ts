import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'

const expoDb = openDatabaseSync('esliph_finance.db')
export const db = drizzle(expoDb, { casing: 'snake_case' })
