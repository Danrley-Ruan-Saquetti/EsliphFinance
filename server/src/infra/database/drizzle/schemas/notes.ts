import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id').notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  table => [index('notes_owner_id_index').on(table.ownerId)],
)
