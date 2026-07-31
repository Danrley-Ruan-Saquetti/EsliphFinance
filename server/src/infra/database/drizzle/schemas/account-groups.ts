import { index, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { users } from './users'

export const accountGroupType = pgEnum('account_group_type', ['DEFAULT', 'CREDIT_CARD'])

export const accountGroups = pgTable(
  'account_groups',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    name: varchar('name', { length: 120 }).notNull(),
    type: accountGroupType('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  table => [index('account_groups_owner_id_index').on(table.ownerId)],
)
