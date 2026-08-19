import { date, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { accounts } from './accounts'
import { categories } from './categories'
import { moneyAmount } from './money-amount'
import { users } from './users'

export const transactionType = pgEnum('transaction_type', ['INCOME', 'EXPENSE', 'TRANSFER'])
export const transactionStatus = pgEnum('transaction_status', ['PLANNED', 'SETTLED'])

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    categoryId: uuid('category_id').references(() => categories.id),
    type: transactionType('type').notNull(),
    status: transactionStatus('status').notNull(),
    date: date('date', { mode: 'date' }).notNull(),
    amount: moneyAmount('amount').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  table => [
    index('transactions_owner_id_index').on(table.ownerId),
    index('transactions_account_id_index').on(table.accountId),
    index('transactions_category_id_index').on(table.categoryId),
  ],
)
