import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { EndSessionUseCase } from '@domain/user/application/use-cases/end-session'
import { RefreshTokenProps } from '@domain/user/enterprise/entities/refresh-token'
import { InMemoryRefreshTokensRepository } from '@infra/database/in-memory/in-memory-refresh-tokens-repository'
import { FakeRefreshTokenGenerator } from '@tests/cryptography/fake-refresh-token-generator'
import { makeRefreshToken } from '@tests/factories/make-refresh-token'

const MILLISECONDS_IN_SECOND = 1000
const ONE_HOUR_IN_MILLISECONDS = 3600000
const ISSUED_TOKEN = 'token-de-renovação-emitido'
const OTHER_SESSION_TOKEN = 'token-de-renovação-de-outra-sessão'

let refreshTokensRepository: InMemoryRefreshTokensRepository
let refreshTokenGenerator: FakeRefreshTokenGenerator
let sut: EndSessionUseCase

async function storeRefreshToken(override: Partial<RefreshTokenProps> = {}, token = ISSUED_TOKEN) {
  const refreshToken = makeRefreshToken({ tokenHash: refreshTokenGenerator.hash(token), ...override })

  await refreshTokensRepository.create(refreshToken)

  return refreshToken
}

describe('Encerrar sessão', () => {
  beforeEach(() => {
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    refreshTokenGenerator = new FakeRefreshTokenGenerator()
    sut = new EndSessionUseCase(refreshTokensRepository, refreshTokenGenerator)
  })

  it('deve revogar o token de renovação da sessão encerrada (RN008)', async () => {
    const userId = new UniqueEntityID()
    const storedRefreshToken = await storeRefreshToken({ userId })

    const result = await sut.execute({ userId: userId.toString(), refreshToken: ISSUED_TOKEN })

    expect(result.isRight()).toBe(true)
    expect(storedRefreshToken.isRevoked).toBe(true)
    expect(refreshTokensRepository.items[0].revokedAt).toEqual(expect.any(Date))
  })

  it('deve deixar o token de renovação inutilizável após o encerramento (RN008)', async () => {
    const userId = new UniqueEntityID()
    const storedRefreshToken = await storeRefreshToken({ userId })

    await sut.execute({ userId: userId.toString(), refreshToken: ISSUED_TOKEN })

    expect(storedRefreshToken.isUsable).toBe(false)
  })

  it('deve manter as demais sessões do usuário válidas (RN008)', async () => {
    const userId = new UniqueEntityID()

    await storeRefreshToken({ userId })
    await storeRefreshToken({ userId }, OTHER_SESSION_TOKEN)

    await sut.execute({ userId: userId.toString(), refreshToken: ISSUED_TOKEN })

    expect(refreshTokensRepository.items[0].isRevoked).toBe(true)
    expect(refreshTokensRepository.items[1].isUsable).toBe(true)
  })

  it('deve encerrar a sessão sem erro quando o token de renovação já foi revogado (RN008)', async () => {
    const userId = new UniqueEntityID()
    const revokedAt = new Date(Date.now() - MILLISECONDS_IN_SECOND)

    await storeRefreshToken({ userId, revokedAt })

    const result = await sut.execute({ userId: userId.toString(), refreshToken: ISSUED_TOKEN })

    expect(result.isRight()).toBe(true)
    expect(refreshTokensRepository.items[0].revokedAt).toEqual(revokedAt)
  })

  it('deve encerrar a sessão sem erro quando o token de renovação não existe (RN008)', async () => {
    const result = await sut.execute({ userId: new UniqueEntityID().toString(), refreshToken: 'token-inexistente' })

    expect(result.isRight()).toBe(true)
    expect(refreshTokensRepository.items).toHaveLength(0)
  })

  it('deve revogar o token de renovação já expirado sem erro (RN008)', async () => {
    const userId = new UniqueEntityID()

    await storeRefreshToken({
      userId,
      createdAt: new Date(Date.now() - ONE_HOUR_IN_MILLISECONDS),
      expiresAt: new Date(Date.now() - MILLISECONDS_IN_SECOND),
    })

    const result = await sut.execute({ userId: userId.toString(), refreshToken: ISSUED_TOKEN })

    expect(result.isRight()).toBe(true)
    expect(refreshTokensRepository.items[0].isRevoked).toBe(true)
  })

  it('deve manter válido o token de renovação de outro usuário, tratando-o como inexistente (RN010, RN011)', async () => {
    await storeRefreshToken({ userId: new UniqueEntityID() })

    const result = await sut.execute({ userId: new UniqueEntityID().toString(), refreshToken: ISSUED_TOKEN })

    expect(result.isRight()).toBe(true)
    expect(refreshTokensRepository.items[0].isRevoked).toBe(false)
    expect(refreshTokensRepository.items[0].isUsable).toBe(true)
  })
})
