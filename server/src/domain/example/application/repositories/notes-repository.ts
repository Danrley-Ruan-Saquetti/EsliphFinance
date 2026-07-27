import { Note } from '@domain/example/enterprise/entities/note'

export abstract class NotesRepository {
  abstract create(note: Note): Promise<void>

  abstract save(note: Note): Promise<void>

  abstract findById(id: string): Promise<Note | null>

  abstract findManyByOwnerId(ownerId: string): Promise<Note[]>
}
