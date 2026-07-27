import { Either, right } from '@core/either'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { UseCase } from '@core/use-case'
import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { Note } from '@domain/example/enterprise/entities/note'

export interface CreateNoteRequest {
  ownerId: string
  title: string
  content: string
}

export type CreateNoteResponse = Either<never, { note: Note }>

export class CreateNoteUseCase implements UseCase<CreateNoteRequest, CreateNoteResponse> {
  constructor(private readonly notesRepository: NotesRepository) {}

  async execute({ ownerId, title, content }: CreateNoteRequest): Promise<CreateNoteResponse> {
    const note = Note.create({ ownerId: new UniqueEntityID(ownerId), title, content })

    await this.notesRepository.create(note)

    return right({ note })
  }
}
