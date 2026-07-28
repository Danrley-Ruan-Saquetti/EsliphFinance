import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { Note } from '@domain/example/enterprise/entities/note'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { DrizzleNoteMapper } from '@infra/database/drizzle/mappers/drizzle-note-mapper'
import { notes } from '@infra/database/drizzle/schemas/notes'

@Injectable()
export class DrizzleNotesRepository extends NotesRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super()
  }

  async create(note: Note): Promise<void> {
    await this.drizzle.db.insert(notes).values(DrizzleNoteMapper.toPersistence(note))
  }

  async save(note: Note): Promise<void> {
    const record = DrizzleNoteMapper.toPersistence(note)

    await this.drizzle.db.update(notes).set(record).where(eq(notes.id, record.id))
  }

  async findById(id: string): Promise<Note | null> {
    const [record] = await this.drizzle.db.select().from(notes).where(eq(notes.id, id)).limit(1)

    if (!record) {
      return null
    }

    return DrizzleNoteMapper.toDomain(record)
  }

  async findManyByOwnerId(ownerId: string): Promise<Note[]> {
    const records = await this.drizzle.db.select().from(notes).where(eq(notes.ownerId, ownerId))

    return records.map(record => DrizzleNoteMapper.toDomain(record))
  }
}
