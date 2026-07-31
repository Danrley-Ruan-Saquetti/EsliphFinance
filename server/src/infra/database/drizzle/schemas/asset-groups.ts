import { index, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { users } from './users'

export const assetGroupType = pgEnum('asset_group_type', ['DEFAULT', 'CREDIT_CARD'])

export const assetGroups = pgTable(
  'asset_groups',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    name: varchar('name', { length: 120 }).notNull(),
    type: assetGroupType('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  table => [index('asset_groups_owner_id_index').on(table.ownerId)],
)
