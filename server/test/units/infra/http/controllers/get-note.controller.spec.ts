import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { GetNoteUseCase } from '@domain/example/application/use-cases/get-note'
import { InMemoryNotesRepository } from '@infra/database/in-memory/in-memory-notes-repository'
import { GetNoteController } from '@infra/http/controllers/get-note.controller'
import { makeNote } from '@tests/factories/make-note'

let notesRepository: InMemoryNotesRepository
let sut: GetNoteController

describe('GetNoteController', () => {
  beforeEach(() => {
    notesRepository = new InMemoryNotesRepository()
    sut = new GetNoteController(new GetNoteUseCase(notesRepository))
  })

  it('deve devolver a nota do usuário autenticado no formato de resposta', async () => {
    const ownerId = new UniqueEntityID()
    const note = makeNote({ ownerId })

    await notesRepository.create(note)

    const currentUser = { id: ownerId.toString() }
    const params = { id: note.id.toString() }

    const response = await sut.handle(currentUser, params)

    expect(response.note).toEqual({
      id: note.id.toString(),
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: null,
    })
  })

  it('deve propagar ResourceNotFoundError quando a nota não existe', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const params = { id: new UniqueEntityID().toString() }

    await expect(sut.handle(currentUser, params)).rejects.toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve propagar ResourceNotFoundError quando a nota é de outro usuário (RN010, RN011)', async () => {
    const note = makeNote()

    await notesRepository.create(note)

    const currentUser = { id: new UniqueEntityID().toString() }
    const params = { id: note.id.toString() }

    await expect(sut.handle(currentUser, params)).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
