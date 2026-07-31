import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { CreateNoteUseCase } from '@domain/example/application/use-cases/create-note'
import { InMemoryNotesRepository } from '@infra/database/in-memory/in-memory-notes-repository'
import { CreateNoteController } from '@infra/http/controllers/create-note.controller'

let notesRepository: InMemoryNotesRepository
let sut: CreateNoteController

describe('CreateNoteController', () => {
  beforeEach(() => {
    notesRepository = new InMemoryNotesRepository()
    sut = new CreateNoteController(new CreateNoteUseCase(notesRepository))
  })

  it('deve devolver a nota criada no formato de resposta', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    const response = await sut.handle(currentUser, { title: 'Título', content: 'Conteúdo' })

    expect(response.note).toEqual({
      id: notesRepository.items[0].id.toString(),
      title: 'Título',
      content: 'Conteúdo',
      createdAt: notesRepository.items[0].createdAt,
      updatedAt: null,
    })
  })

  it('deve persistir a nota vinculada ao usuário autenticado (RN010)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    await sut.handle(currentUser, { title: 'Título', content: 'Conteúdo' })

    expect(notesRepository.items).toHaveLength(1)
    expect(notesRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })

  it('deve ignorar o dono informado no corpo e vincular a nota ao usuário do token (RN010, RN011)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const forgedBody = Object.assign({ title: 'Título', content: 'Conteúdo' }, { ownerId: new UniqueEntityID().toString() })

    await sut.handle(currentUser, forgedBody)

    expect(notesRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })
})
