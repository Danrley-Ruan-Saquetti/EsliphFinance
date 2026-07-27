import { Injectable } from '@nestjs/common'

import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { Note } from '@domain/example/enterprise/entities/note'

@Injectable()
export class InMemoryNotesRepository extends NotesRepository {
  readonly items: Note[] = []

  create(note: Note): Promise<void> {
    this.items.push(note)

    return Promise.resolve()
  }

  save(note: Note): Promise<void> {
    const index = this.items.findIndex(item => item.id.equals(note.id))

    if (index >= 0) {
      this.items[index] = note
    }

    return Promise.resolve()
  }

  findById(id: string): Promise<Note | null> {
    return Promise.resolve(this.items.find(item => item.id.toString() === id) ?? null)
  }

  findManyByOwnerId(ownerId: string): Promise<Note[]> {
    return Promise.resolve(this.items.filter(item => item.ownerId.toString() === ownerId))
  }
}
