import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { EndSessionUseCase } from '@domain/user/application/use-cases/end-session'
import { InMemoryRefreshTokensRepository } from '@infra/database/in-memory/in-memory-refresh-tokens-repository'
import { EndSessionController } from '@infra/http/controllers/end-session.controller'
import { FakeRefreshTokenGenerator } from '@tests/cryptography/fake-refresh-token-generator'
import { makeRefreshToken } from '@tests/factories/make-refresh-token'

const ISSUED_TOKEN = 'token-de-renovação-emitido'

let refreshTokensRepository: InMemoryRefreshTokensRepository
let refreshTokenGenerator: FakeRefreshTokenGenerator
let sut: EndSessionController

describe('EndSessionController', () => {
  beforeEach(() => {
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    refreshTokenGenerator = new FakeRefreshTokenGenerator()
    sut = new EndSessionController(new EndSessionUseCase(refreshTokensRepository, refreshTokenGenerator))
  })

  it('deve revogar o token de renovação da sessão do usuário autenticado (RN008)', async () => {
    const userId = new UniqueEntityID()

    await refreshTokensRepository.create(makeRefreshToken({ userId, tokenHash: refreshTokenGenerator.hash(ISSUED_TOKEN) }))

    const response = await sut.handle({ id: userId.toString() }, { refreshToken: ISSUED_TOKEN })

    expect(response).toBeUndefined()
    expect(refreshTokensRepository.items[0].isRevoked).toBe(true)
  })

  it('deve encerrar a sessão sem erro quando o token de renovação já foi revogado (RN008)', async () => {
    const userId = new UniqueEntityID()

    await refreshTokensRepository.create(makeRefreshToken({ userId, tokenHash: refreshTokenGenerator.hash(ISSUED_TOKEN) }))

    await sut.handle({ id: userId.toString() }, { refreshToken: ISSUED_TOKEN })

    await expect(sut.handle({ id: userId.toString() }, { refreshToken: ISSUED_TOKEN })).resolves.toBeUndefined()
  })

  it('deve responder sem erro e sem revogar quando o token de renovação é de outro usuário (RN010, RN011)', async () => {
    await refreshTokensRepository.create(makeRefreshToken({ tokenHash: refreshTokenGenerator.hash(ISSUED_TOKEN) }))

    await expect(sut.handle({ id: new UniqueEntityID().toString() }, { refreshToken: ISSUED_TOKEN })).resolves.toBeUndefined()
    expect(refreshTokensRepository.items[0].isUsable).toBe(true)
  })

  it('deve ignorar o usuário informado no corpo e encerrar a sessão do token (RN010, RN011)', async () => {
    const otherUserId = new UniqueEntityID()

    await refreshTokensRepository.create(makeRefreshToken({ userId: otherUserId, tokenHash: refreshTokenGenerator.hash(ISSUED_TOKEN) }))

    const forgedBody = Object.assign({ refreshToken: ISSUED_TOKEN }, { userId: otherUserId.toString() })

    await sut.handle({ id: new UniqueEntityID().toString() }, forgedBody)

    expect(refreshTokensRepository.items[0].isUsable).toBe(true)
  })
})
