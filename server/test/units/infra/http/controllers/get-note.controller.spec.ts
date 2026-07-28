import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it } from 'vitest'

import { left } from '@core/either'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { BaseError } from '@core/errors/base-error'
import { GetNoteResponse, GetNoteUseCase } from '@domain/example/application/use-cases/get-note'
import { InMemoryNotesRepository } from '@infra/database/in-memory/in-memory-notes-repository'
import { GetNoteController } from '@infra/http/controllers/get-note.controller'
import { makeNote } from '@tests/factories/make-note'

class UnexpectedError extends BaseError {
  readonly code = 'UNEXPECTED'

  constructor() {
    super('Unexpected failure')
  }
}

class FailingGetNoteUseCase extends GetNoteUseCase {
  constructor(private readonly error: BaseError) {
    super(new InMemoryNotesRepository())
  }

  execute(): Promise<GetNoteResponse> {
    return Promise.resolve(left(this.error) as unknown as GetNoteResponse)
  }
}

let notesRepository: InMemoryNotesRepository
let sut: GetNoteController

describe('GetNoteController', () => {
  beforeEach(() => {
    notesRepository = new InMemoryNotesRepository()
    sut = new GetNoteController(new GetNoteUseCase(notesRepository))
  })

  it('deve devolver a nota do próprio dono no formato de resposta', async () => {
    const ownerId = new UniqueEntityID()
    const note = makeNote({ ownerId })

    await notesRepository.create(note)

    const response = await sut.handle({ id: note.id.toString() }, { ownerId: ownerId.toString() })

    expect(response.note).toEqual({
      id: note.id.toString(),
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: null,
    })
  })

  it('deve lançar NotFoundException quando a nota não existe', async () => {
    const params = { id: new UniqueEntityID().toString() }
    const query = { ownerId: new UniqueEntityID().toString() }

    await expect(sut.handle(params, query)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('deve lançar ForbiddenException quando a nota é de outro usuário (RN010, RN011)', async () => {
    const note = makeNote()

    await notesRepository.create(note)

    const params = { id: note.id.toString() }
    const query = { ownerId: new UniqueEntityID().toString() }

    await expect(sut.handle(params, query)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('deve lançar BadRequestException quando o erro não tem tradução específica', async () => {
    const controller = new GetNoteController(new FailingGetNoteUseCase(new UnexpectedError()))

    const params = { id: new UniqueEntityID().toString() }
    const query = { ownerId: new UniqueEntityID().toString() }

    await expect(controller.handle(params, query)).rejects.toBeInstanceOf(BadRequestException)
  })
})
