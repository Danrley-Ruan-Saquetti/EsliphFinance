import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { DrizzleNoteMapper, NoteRecord } from '@infra/database/drizzle/mappers/drizzle-note-mapper'
import { makeNote } from '@tests/factories/make-note'

function makeRecord(override: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id: new UniqueEntityID().toString(),
    ownerId: new UniqueEntityID().toString(),
    title: 'Título',
    content: 'Conteúdo',
    createdAt: new Date('2026-01-15T12:00:00.000Z'),
    updatedAt: null,
    ...override,
  }
}

describe('DrizzleNoteMapper', () => {
  it('deve converter o registro do banco em entidade preservando o identificador', () => {
    const record = makeRecord()

    const note = DrizzleNoteMapper.toDomain(record)

    expect(note.id.toString()).toBe(record.id)
    expect(note.ownerId.toString()).toBe(record.ownerId)
    expect(note.title).toBe(record.title)
    expect(note.content).toBe(record.content)
    expect(note.createdAt).toEqual(record.createdAt)
    expect(note.updatedAt).toBeNull()
  })

  it('deve converter o registro do banco com data de atualização preenchida', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')

    const note = DrizzleNoteMapper.toDomain(makeRecord({ updatedAt }))

    expect(note.updatedAt).toEqual(updatedAt)
  })

  it('deve converter a entidade em registro de persistência', () => {
    const note = makeNote()

    const record = DrizzleNoteMapper.toPersistence(note)

    expect(record).toEqual({
      id: note.id.toString(),
      ownerId: note.ownerId.toString(),
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: null,
    })
  })

  it('deve persistir a data de atualização como nula quando a nota nunca foi alterada', () => {
    expect(DrizzleNoteMapper.toPersistence(makeNote()).updatedAt).toBeNull()
  })

  it('deve manter a entidade equivalente ao percorrer os dois sentidos da conversão', () => {
    const record = makeRecord()

    expect(DrizzleNoteMapper.toPersistence(DrizzleNoteMapper.toDomain(record))).toEqual(record)
  })
})
