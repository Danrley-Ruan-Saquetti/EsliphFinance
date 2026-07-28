import { bigint } from 'drizzle-orm/pg-core'

export function moneyAmount(name: string) {
  return bigint(name, { mode: 'number' })
}
