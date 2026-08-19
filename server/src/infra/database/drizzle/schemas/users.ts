import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const userDefaultTransactionStatus = pgEnum('user_default_transaction_status', ['PLANNED', 'SETTLED'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  defaultTransactionStatus: userDefaultTransactionStatus('default_transaction_status'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
