import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvalidRefreshTokenError } from '@domain/user/application/use-cases/errors/invalid-refresh-token-error'
import { RefreshSessionUseCase } from '@domain/user/application/use-cases/refresh-session'
import { RefreshTokenProps } from '@domain/user/enterprise/entities/refresh-token'
import { InMemoryRefreshTokensRepository } from '@infra/database/in-memory/in-memory-refresh-tokens-repository'
import { FakeAccessTokenGenerator } from '@tests/cryptography/fake-access-token-generator'
import { FakeRefreshTokenGenerator } from '@tests/cryptography/fake-refresh-token-generator'
import { makeRefreshToken } from '@tests/factories/make-refresh-token'

const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 2592000
const MILLISECONDS_IN_SECOND = 1000
const ONE_HOUR_IN_MILLISECONDS = 3600000
const ISSUED_TOKEN = 'token-de-renovação-emitido'

let refreshTokensRepository: InMemoryRefreshTokensRepository
let accessTokenGenerator: FakeAccessTokenGenerator
let refreshTokenGenerator: FakeRefreshTokenGenerator
let sut: RefreshSessionUseCase

async function storeRefreshToken(override: Partial<RefreshTokenProps> = {}) {
  const refreshToken = makeRefreshToken({ tokenHash: refreshTokenGenerator.hash(ISSUED_TOKEN), ...override })

  await refreshTokensRepository.create(refreshToken)

  return refreshToken
}

describe('Renovar sessão', () => {
  beforeEach(() => {
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    accessTokenGenerator = new FakeAccessTokenGenerator()
    refreshTokenGenerator = new FakeRefreshTokenGenerator()
    sut = new RefreshSessionUseCase(refreshTokensRepository, accessTokenGenerator, refreshTokenGenerator, REFRESH_TOKEN_EXPIRES_IN_SECONDS)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve emitir um novo par de tokens a partir do token de renovação válido (RN006)', async () => {
    await storeRefreshToken()

    const result = await sut.execute({ refreshToken: ISSUED_TOKEN })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accessToken).toEqual(expect.any(String))
      expect(result.value.refreshToken).toEqual(expect.any(String))
    }
  })

  it('deve emitir o token de acesso em nome do dono do token de renovação (RN006)', async () => {
    const userId = new UniqueEntityID()

    await storeRefreshToken({ userId })

    const result = await sut.execute({ refreshToken: ISSUED_TOKEN })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accessToken).toBe(`${FakeAccessTokenGenerator.PREFIX}${userId.toString()}`)
    }
  })

  it('deve revogar o token de renovação utilizado (RN007)', async () => {
    const storedRefreshToken = await storeRefreshToken()

    await sut.execute({ refreshToken: ISSUED_TOKEN })

    expect(storedRefreshToken.isRevoked).toBe(true)
    expect(refreshTokensRepository.items[0].revokedAt).toEqual(expect.any(Date))
  })

  it('deve emitir um token de renovação distinto do utilizado (RN007)', async () => {
    await storeRefreshToken()

    const result = await sut.execute({ refreshToken: ISSUED_TOKEN })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.refreshToken).not.toBe(ISSUED_TOKEN)
    }
    expect(refreshTokensRepository.items).toHaveLength(2)
  })

  it('deve persistir o novo token de renovação vinculado ao mesmo usuário (RN007)', async () => {
    const userId = new UniqueEntityID()

    await storeRefreshToken({ userId })

    await sut.execute({ refreshToken: ISSUED_TOKEN })

    expect(refreshTokensRepository.items[1].userId.toString()).toBe(userId.toString())
    expect(refreshTokensRepository.items[1].isRevoked).toBe(false)
  })

  it('deve persistir apenas o hash do novo token de renovação, nunca o token entregue ao usuário', async () => {
    await storeRefreshToken()

    const result = await sut.execute({ refreshToken: ISSUED_TOKEN })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(refreshTokensRepository.items[1].tokenHash).not.toBe(result.value.refreshToken)
      expect(refreshTokensRepository.items[1].tokenHash).toBe(refreshTokenGenerator.hash(result.value.refreshToken))
    }
  })

  it('deve expirar o novo token de renovação conforme o prazo configurado (RN006)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-29T12:00:00.000Z'))

    await storeRefreshToken()

    await sut.execute({ refreshToken: ISSUED_TOKEN })

    expect(refreshTokensRepository.items[1].expiresAt).toEqual(new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_SECONDS * MILLISECONDS_IN_SECOND))
  })

  it('deve retornar InvalidRefreshTokenError quando o token de renovação já foi utilizado (RN007)', async () => {
    await storeRefreshToken()

    await sut.execute({ refreshToken: ISSUED_TOKEN })

    const result = await sut.execute({ refreshToken: ISSUED_TOKEN })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidRefreshTokenError)
    }
    expect(refreshTokensRepository.items).toHaveLength(2)
  })

  it('deve retornar InvalidRefreshTokenError quando o token de renovação não existe (RN006)', async () => {
    const result = await sut.execute({ refreshToken: 'token-inexistente' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidRefreshTokenError)
    }
    expect(refreshTokensRepository.items).toHaveLength(0)
  })

  it('deve retornar InvalidRefreshTokenError quando o token de renovação está expirado (RN006)', async () => {
    await storeRefreshToken({ createdAt: new Date(Date.now() - ONE_HOUR_IN_MILLISECONDS), expiresAt: new Date(Date.now() - MILLISECONDS_IN_SECOND) })

    const result = await sut.execute({ refreshToken: ISSUED_TOKEN })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidRefreshTokenError)
    }
    expect(refreshTokensRepository.items).toHaveLength(1)
  })

  it('deve retornar InvalidRefreshTokenError quando o token de renovação foi revogado no encerramento da sessão (RN008)', async () => {
    await storeRefreshToken({ revokedAt: new Date() })

    const result = await sut.execute({ refreshToken: ISSUED_TOKEN })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidRefreshTokenError)
    }
    expect(refreshTokensRepository.items).toHaveLength(1)
  })
})
