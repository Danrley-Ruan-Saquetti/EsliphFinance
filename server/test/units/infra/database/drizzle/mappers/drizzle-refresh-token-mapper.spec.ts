import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { DrizzleRefreshTokenMapper, RefreshTokenRecord } from '@infra/database/drizzle/mappers/drizzle-refresh-token-mapper'
import { makeRefreshToken } from '@tests/factories/make-refresh-token'

const createdAt = new Date('2026-07-29T12:00:00.000Z')
const expiresAt = new Date('2026-08-28T12:00:00.000Z')

function makeRecord(override: Partial<RefreshTokenRecord> = {}): RefreshTokenRecord {
  return {
    id: '9f1c1d0e-6a3a-4f7f-9a0e-2f2b0e7d51c3',
    userId: '6d0f1a1e-2b6b-4a5f-9a0e-2f2b0e7d51c3',
    tokenHash: 'hash-do-token-de-renovação',
    expiresAt,
    createdAt,
    revokedAt: null,
    ...override,
  }
}

describe('DrizzleRefreshTokenMapper', () => {
  it('deve traduzir o registro do banco para a entidade', () => {
    const refreshToken = DrizzleRefreshTokenMapper.toDomain(makeRecord())

    expect(refreshToken.id.toString()).toBe('9f1c1d0e-6a3a-4f7f-9a0e-2f2b0e7d51c3')
    expect(refreshToken.userId.toString()).toBe('6d0f1a1e-2b6b-4a5f-9a0e-2f2b0e7d51c3')
    expect(refreshToken.tokenHash).toBe('hash-do-token-de-renovação')
    expect(refreshToken.expiresAt).toEqual(expiresAt)
    expect(refreshToken.createdAt).toEqual(createdAt)
    expect(refreshToken.revokedAt).toBeNull()
  })

  it('deve preservar a data de revogação do registro (RN007, RN008)', () => {
    const revokedAt = new Date('2026-07-30T12:00:00.000Z')

    const refreshToken = DrizzleRefreshTokenMapper.toDomain(makeRecord({ revokedAt }))

    expect(refreshToken.revokedAt).toEqual(revokedAt)
    expect(refreshToken.isRevoked).toBe(true)
  })

  it('deve traduzir a entidade para o registro do banco', () => {
    const userId = new UniqueEntityID()
    const refreshToken = makeRefreshToken({ userId, tokenHash: 'hash-do-token-de-renovação', expiresAt, createdAt })

    const record = DrizzleRefreshTokenMapper.toPersistence(refreshToken)

    expect(record).toEqual({
      id: refreshToken.id.toString(),
      userId: userId.toString(),
      tokenHash: 'hash-do-token-de-renovação',
      expiresAt,
      createdAt,
      revokedAt: null,
    })
  })

  it('deve persistir a revogação como nula quando a entidade não foi revogada', () => {
    const record = DrizzleRefreshTokenMapper.toPersistence(makeRefreshToken())

    expect(record.revokedAt).toBeNull()
  })
})
