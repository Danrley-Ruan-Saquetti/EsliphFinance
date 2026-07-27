import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { CreateNoteUseCase } from '@domain/example/application/use-cases/create-note'
import { InMemoryNotesRepository } from '@infra/database/in-memory/in-memory-notes-repository'

let notesRepository: InMemoryNotesRepository
let sut: CreateNoteUseCase

describe('Criar nota (caso de uso de exemplo)', () => {
  beforeEach(() => {
    notesRepository = new InMemoryNotesRepository()
    sut = new CreateNoteUseCase(notesRepository)
  })

  it('deve criar a nota e persisti-la no repositório', async () => {
    const ownerId = new UniqueEntityID().toString()

    const result = await sut.execute({ ownerId, title: 'Título', content: 'Conteúdo' })

    expect(result.isRight()).toBe(true)
    expect(notesRepository.items).toHaveLength(1)
    expect(notesRepository.items[0].ownerId.toString()).toBe(ownerId)
  })
})
