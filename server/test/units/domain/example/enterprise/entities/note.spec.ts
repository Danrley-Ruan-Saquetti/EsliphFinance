import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Note } from '@domain/example/enterprise/entities/note'

describe('Note (entidade de exemplo)', () => {
  it('deve criar uma nota com id e data de criação', () => {
    const note = Note.create({ ownerId: new UniqueEntityID(), title: 'Título', content: 'Conteúdo' })

    expect(note.id.toString()).toBeTruthy()
    expect(note.createdAt).toBeInstanceOf(Date)
    expect(note.updatedAt).toBeUndefined()
  })

  it('deve lançar ao violar a invariante de título', () => {
    const ownerId = new UniqueEntityID()

    expect(() => Note.create({ ownerId, title: '   ', content: 'Conteúdo' })).toThrow(InvariantError)
    expect(() => Note.create({ ownerId, title: 'a'.repeat(121), content: 'Conteúdo' })).toThrow(InvariantError)
  })

  it('deve marcar a data de atualização ao renomear', () => {
    const note = Note.create({ ownerId: new UniqueEntityID(), title: 'Título', content: 'Conteúdo' })

    note.rename('  Outro título  ')

    expect(note.title).toBe('Outro título')
    expect(note.updatedAt).toBeInstanceOf(Date)
  })
})
