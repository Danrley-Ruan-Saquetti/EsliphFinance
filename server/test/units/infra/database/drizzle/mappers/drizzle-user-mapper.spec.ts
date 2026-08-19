import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { DrizzleUserMapper, UserRecord } from '@infra/database/drizzle/mappers/drizzle-user-mapper'
import { makeUser } from '@tests/factories/make-user'

const record: UserRecord = {
  id: new UniqueEntityID().toString(),
  name: 'Fulano de Tal',
  email: 'fulano@exemplo.com',
  passwordHash: 'hash-da-senha',
  defaultTransactionStatus: 'PLANNED',
  createdAt: new Date(2026, 0, 1),
  updatedAt: new Date(2026, 0, 2),
  deletedAt: new Date(2026, 0, 3),
}

describe('DrizzleUserMapper', () => {
  it('deve traduzir o registro do banco para a entidade', () => {
    const user = DrizzleUserMapper.toDomain(record)

    expect(user.id.toString()).toBe(record.id)
    expect(user.name).toBe(record.name)
    expect(user.email.value).toBe(record.email)
    expect(user.passwordHash).toBe(record.passwordHash)
    expect(user.defaultTransactionStatus).toBe(record.defaultTransactionStatus)
    expect(user.createdAt).toBe(record.createdAt)
    expect(user.updatedAt).toBe(record.updatedAt)
    expect(user.deletedAt).toBe(record.deletedAt)
  })

  it('deve traduzir o registro do banco com as datas opcionais nulas', () => {
    const user = DrizzleUserMapper.toDomain({ ...record, updatedAt: null, deletedAt: null })

    expect(user.updatedAt).toBeNull()
    expect(user.deletedAt).toBeNull()
    expect(user.isDeleted).toBe(false)
  })

  it('deve traduzir o registro do banco sem preferência de situação padrão de transação (RN049)', () => {
    const user = DrizzleUserMapper.toDomain({ ...record, defaultTransactionStatus: null })

    expect(user.defaultTransactionStatus).toBeNull()
  })

  it('deve traduzir a entidade para o registro do banco', () => {
    const id = new UniqueEntityID()
    const user = makeUser(
      {
        name: 'Fulano de Tal',
        email: Email.create('fulano@exemplo.com'),
        passwordHash: 'hash-da-senha',
        defaultTransactionStatus: 'PLANNED',
        createdAt: new Date(2026, 0, 1),
        updatedAt: new Date(2026, 0, 2),
        deletedAt: new Date(2026, 0, 3),
      },
      id,
    )

    expect(DrizzleUserMapper.toPersistence(user)).toEqual({ ...record, id: id.toString() })
  })

  it('deve traduzir a entidade sem datas opcionais para colunas nulas', () => {
    const user = makeUser({ createdAt: new Date(2026, 0, 1) })

    const persisted = DrizzleUserMapper.toPersistence(user)

    expect(persisted.updatedAt).toBeNull()
    expect(persisted.deletedAt).toBeNull()
  })

  it('deve traduzir a entidade sem preferência de situação padrão de transação para coluna nula (RN049)', () => {
    const user = makeUser()

    const persisted = DrizzleUserMapper.toPersistence(user)

    expect(persisted.defaultTransactionStatus).toBeNull()
  })
})
