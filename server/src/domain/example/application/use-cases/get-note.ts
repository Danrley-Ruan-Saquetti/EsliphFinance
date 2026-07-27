import { Either, left, right } from '@core/either'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { Note } from '@domain/example/enterprise/entities/note'

export interface GetNoteRequest {
  noteId: string
  ownerId: string
}

export type GetNoteResponse = Either<ResourceNotFoundError | NotAllowedError, { note: Note }>

export class GetNoteUseCase implements UseCase<GetNoteRequest, GetNoteResponse> {
  constructor(private readonly notesRepository: NotesRepository) {}

  async execute({ noteId, ownerId }: GetNoteRequest): Promise<GetNoteResponse> {
    const note = await this.notesRepository.findById(noteId)

    if (!note) {
      return left(new ResourceNotFoundError('Note'))
    }

    if (!this.isOwnedBy(note, ownerId)) {
      return left(new NotAllowedError())
    }

    return right({ note })
  }

  private isOwnedBy(note: Note, ownerId: string): boolean {
    return note.ownerId.toString() === ownerId
  }
}
