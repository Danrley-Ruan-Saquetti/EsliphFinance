import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { GetNoteUseCase } from '@domain/example/application/use-cases/get-note'
import { InMemoryNotesRepository } from '@infra/database/in-memory/in-memory-notes-repository'
import { makeNote } from '@tests/factories/make-note'

let notesRepository: InMemoryNotesRepository
let sut: GetNoteUseCase

describe('Consultar nota (caso de uso de exemplo)', () => {
  beforeEach(() => {
    notesRepository = new InMemoryNotesRepository()
    sut = new GetNoteUseCase(notesRepository)
  })

  it('deve retornar a nota do próprio dono', async () => {
    const ownerId = new UniqueEntityID()
    const note = makeNote({ ownerId })

    await notesRepository.create(note)

    const result = await sut.execute({ noteId: note.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.note.title).toBe('Título')
    }
  })

  it('deve retornar ResourceNotFoundError quando a nota não existe', async () => {
    const result = await sut.execute({ noteId: 'inexistente', ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    }
  })

  it('deve retornar NotAllowedError quando a nota é de outro usuário (RN010, RN011)', async () => {
    const note = makeNote()

    await notesRepository.create(note)

    const result = await sut.execute({ noteId: note.id.toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(NotAllowedError)
    }
  })
})
