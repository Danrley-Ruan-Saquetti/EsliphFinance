import { AnyPgColumn, char, index, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { users } from './users'

export const categoryNature = pgEnum('category_nature', ['INCOME', 'EXPENSE', 'BOTH'])

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
    name: varchar('name', { length: 120 }).notNull(),
    nature: categoryNature('nature').notNull(),
    icon: varchar('icon', { length: 60 }).notNull(),
    color: char('color', { length: 7 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  table => [index('categories_owner_id_index').on(table.ownerId), index('categories_parent_id_index').on(table.parentId)],
)
