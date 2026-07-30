import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvalidRefreshTokenError } from '@domain/user/application/use-cases/errors/invalid-refresh-token-error'
import { RefreshSessionUseCase } from '@domain/user/application/use-cases/refresh-session'
import { InMemoryRefreshTokensRepository } from '@infra/database/in-memory/in-memory-refresh-tokens-repository'
import { RefreshSessionController } from '@infra/http/controllers/refresh-session.controller'
import { FakeAccessTokenGenerator } from '@tests/cryptography/fake-access-token-generator'
import { FakeRefreshTokenGenerator } from '@tests/cryptography/fake-refresh-token-generator'
import { makeRefreshToken } from '@tests/factories/make-refresh-token'

const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 2592000
const ISSUED_TOKEN = 'token-de-renovação-emitido'

let refreshTokensRepository: InMemoryRefreshTokensRepository
let refreshTokenGenerator: FakeRefreshTokenGenerator
let sut: RefreshSessionController

describe('RefreshSessionController', () => {
  beforeEach(() => {
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    refreshTokenGenerator = new FakeRefreshTokenGenerator()
    sut = new RefreshSessionController(
      new RefreshSessionUseCase(refreshTokensRepository, new FakeAccessTokenGenerator(), refreshTokenGenerator, REFRESH_TOKEN_EXPIRES_IN_SECONDS),
    )
  })

  it('deve devolver o novo par de tokens do usuário dono da sessão (RN006)', async () => {
    const userId = new UniqueEntityID()

    await refreshTokensRepository.create(makeRefreshToken({ userId, tokenHash: refreshTokenGenerator.hash(ISSUED_TOKEN) }))

    const response = await sut.handle({ refreshToken: ISSUED_TOKEN })

    expect(response).toEqual({
      accessToken: `${FakeAccessTokenGenerator.PREFIX}${userId.toString()}`,
      refreshToken: expect.any(String) as string,
    })
  })

  it('deve lançar InvalidRefreshTokenError quando o token de renovação já foi utilizado (RN007)', async () => {
    await refreshTokensRepository.create(makeRefreshToken({ tokenHash: refreshTokenGenerator.hash(ISSUED_TOKEN) }))

    await sut.handle({ refreshToken: ISSUED_TOKEN })

    await expect(sut.handle({ refreshToken: ISSUED_TOKEN })).rejects.toBeInstanceOf(InvalidRefreshTokenError)
  })
})
