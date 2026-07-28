import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Note } from '@domain/example/enterprise/entities/note'
import { notes } from '@infra/database/drizzle/schemas/notes'

export type NoteRecord = typeof notes.$inferSelect
export type NoteInsert = typeof notes.$inferInsert

export class DrizzleNoteMapper {
  static toDomain(record: NoteRecord): Note {
    return Note.create(
      {
        ownerId: new UniqueEntityID(record.ownerId),
        title: record.title,
        content: record.content,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      new UniqueEntityID(record.id),
    )
  }

  static toPersistence(note: Note): NoteInsert {
    return {
      id: note.id.toString(),
      ownerId: note.ownerId.toString(),
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt ?? null,
    }
  }
}
