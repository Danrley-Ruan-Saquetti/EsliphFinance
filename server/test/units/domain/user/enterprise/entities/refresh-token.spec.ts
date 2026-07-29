import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { RefreshToken } from '@domain/user/enterprise/entities/refresh-token'

const ONE_HOUR_IN_MILLISECONDS = 3600000

describe('RefreshToken', () => {
  it('deve criar o token de renovação vinculado ao usuário (RN004)', () => {
    const userId = new UniqueEntityID()
    const expiresAt = new Date(Date.now() + ONE_HOUR_IN_MILLISECONDS)

    const refreshToken = RefreshToken.create({ userId, tokenHash: 'hash-do-token', expiresAt })

    expect(refreshToken.userId).toEqual(userId)
    expect(refreshToken.tokenHash).toBe('hash-do-token')
    expect(refreshToken.expiresAt).toEqual(expiresAt)
  })

  it('deve assumir a data atual como criação quando ela não é informada', () => {
    const createdBefore = new Date()

    const refreshToken = RefreshToken.create({
      userId: new UniqueEntityID(),
      tokenHash: 'hash-do-token',
      expiresAt: new Date(Date.now() + ONE_HOUR_IN_MILLISECONDS),
    })

    expect(refreshToken.createdAt.getTime()).toBeGreaterThanOrEqual(createdBefore.getTime())
  })

  it('deve nascer sem revogação, permitindo a sua invalidação posterior (RN007, RN008)', () => {
    const refreshToken = RefreshToken.create({
      userId: new UniqueEntityID(),
      tokenHash: 'hash-do-token',
      expiresAt: new Date(Date.now() + ONE_HOUR_IN_MILLISECONDS),
    })

    expect(refreshToken.revokedAt).toBeUndefined()
    expect(refreshToken.isRevoked).toBe(false)
  })

  it('deve reconhecer o token de renovação já revogado (RN007, RN008)', () => {
    const revokedAt = new Date()

    const refreshToken = RefreshToken.create({
      userId: new UniqueEntityID(),
      tokenHash: 'hash-do-token',
      expiresAt: new Date(Date.now() + ONE_HOUR_IN_MILLISECONDS),
      revokedAt,
    })

    expect(refreshToken.revokedAt).toEqual(revokedAt)
    expect(refreshToken.isRevoked).toBe(true)
  })

  it('deve lançar InvariantError quando o hash do token é vazio', () => {
    const creation = () => RefreshToken.create({ userId: new UniqueEntityID(), tokenHash: '   ', expiresAt: new Date(Date.now() + ONE_HOUR_IN_MILLISECONDS) })

    expect(creation).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando a expiração é anterior à criação (RN005)', () => {
    const createdAt = new Date()
    const creation = () =>
      RefreshToken.create({
        userId: new UniqueEntityID(),
        tokenHash: 'hash-do-token',
        expiresAt: new Date(createdAt.getTime() - 1),
        createdAt,
      })

    expect(creation).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando a expiração é igual à criação (RN005)', () => {
    const createdAt = new Date()
    const creation = () => RefreshToken.create({ userId: new UniqueEntityID(), tokenHash: 'hash-do-token', expiresAt: createdAt, createdAt })

    expect(creation).toThrow(InvariantError)
  })
})
