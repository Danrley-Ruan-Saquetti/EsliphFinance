import { char, index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { accountGroups } from './account-groups'
import { moneyAmount } from './money-amount'
import { users } from './users'

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    accountGroupId: uuid('account_group_id')
      .notNull()
      .references(() => accountGroups.id),
    name: varchar('name', { length: 120 }).notNull(),
    initialBalance: moneyAmount('initial_balance').notNull(),
    icon: varchar('icon', { length: 60 }).notNull(),
    color: char('color', { length: 7 }).notNull(),
    creditLimit: moneyAmount('credit_limit'),
    closingDay: integer('closing_day'),
    dueDay: integer('due_day'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  table => [index('accounts_owner_id_index').on(table.ownerId), index('accounts_account_group_id_index').on(table.accountGroupId)],
)
