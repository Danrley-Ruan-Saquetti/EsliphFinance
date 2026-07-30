import { afterEach, describe, expect, it, vi } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { RefreshToken } from '@domain/user/enterprise/entities/refresh-token'

const ONE_HOUR_IN_MILLISECONDS = 3600000
const ONE_HOUR_IN_SECONDS = 3600

describe('RefreshToken', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('deve emitir o token de renovação com a expiração contada a partir de agora (RN006)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-29T12:00:00.000Z'))

    const refreshToken = RefreshToken.issue({ userId: new UniqueEntityID(), tokenHash: 'hash-do-token', expiresInSeconds: ONE_HOUR_IN_SECONDS })

    expect(refreshToken.createdAt).toEqual(new Date('2026-07-29T12:00:00.000Z'))
    expect(refreshToken.expiresAt).toEqual(new Date('2026-07-29T13:00:00.000Z'))
    expect(refreshToken.isUsable).toBe(true)
  })

  it('deve reconhecer o token de renovação vencido (RN006)', () => {
    const createdAt = new Date(Date.now() - ONE_HOUR_IN_MILLISECONDS)

    const refreshToken = RefreshToken.create({ userId: new UniqueEntityID(), tokenHash: 'hash-do-token', expiresAt: new Date(Date.now() - 1), createdAt })

    expect(refreshToken.isExpired).toBe(true)
    expect(refreshToken.isUsable).toBe(false)
  })

  it('deve invalidar o token de renovação ao ser revogado (RN007, RN008)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-29T12:00:00.000Z'))

    const refreshToken = RefreshToken.issue({ userId: new UniqueEntityID(), tokenHash: 'hash-do-token', expiresInSeconds: ONE_HOUR_IN_SECONDS })

    refreshToken.revoke()

    expect(refreshToken.revokedAt).toEqual(new Date('2026-07-29T12:00:00.000Z'))
    expect(refreshToken.isRevoked).toBe(true)
    expect(refreshToken.isUsable).toBe(false)
  })

  it('deve preservar a revogação original ao revogar o token já revogado (RN007)', () => {
    const revokedAt = new Date(Date.now() - ONE_HOUR_IN_MILLISECONDS)
    const refreshToken = RefreshToken.create({
      userId: new UniqueEntityID(),
      tokenHash: 'hash-do-token',
      expiresAt: new Date(Date.now() + ONE_HOUR_IN_MILLISECONDS),
      revokedAt,
    })

    refreshToken.revoke()

    expect(refreshToken.revokedAt).toEqual(revokedAt)
  })
})
