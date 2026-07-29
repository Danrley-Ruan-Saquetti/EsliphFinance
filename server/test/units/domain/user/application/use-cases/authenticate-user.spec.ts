import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthenticateUserUseCase } from '@domain/user/application/use-cases/authenticate-user'
import { InvalidCredentialsError } from '@domain/user/application/use-cases/errors/invalid-credentials-error'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { InMemoryRefreshTokensRepository } from '@infra/database/in-memory/in-memory-refresh-tokens-repository'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { FakeAccessTokenGenerator } from '@tests/cryptography/fake-access-token-generator'
import { FakeHasher } from '@tests/cryptography/fake-hasher'
import { FakeRefreshTokenGenerator } from '@tests/cryptography/fake-refresh-token-generator'
import { makeUser } from '@tests/factories/make-user'

const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 2592000
const MILLISECONDS_IN_SECOND = 1000

let usersRepository: InMemoryUsersRepository
let refreshTokensRepository: InMemoryRefreshTokensRepository
let hasher: FakeHasher
let accessTokenGenerator: FakeAccessTokenGenerator
let refreshTokenGenerator: FakeRefreshTokenGenerator
let sut: AuthenticateUserUseCase

async function createRegisteredUser(email = 'fulano@exemplo.com', password = 'senha-secreta') {
  const user = makeUser({ email: Email.create(email), passwordHash: await hasher.hash(password) })

  await usersRepository.create(user)

  return user
}

describe('Autenticar usuário', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    hasher = new FakeHasher()
    accessTokenGenerator = new FakeAccessTokenGenerator()
    refreshTokenGenerator = new FakeRefreshTokenGenerator()
    sut = new AuthenticateUserUseCase(
      usersRepository,
      refreshTokensRepository,
      hasher,
      accessTokenGenerator,
      refreshTokenGenerator,
      REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve emitir o token de acesso e o token de renovação para as credenciais válidas (RN004)', async () => {
    await createRegisteredUser()

    const result = await sut.execute({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accessToken).toEqual(expect.any(String))
      expect(result.value.refreshToken).toEqual(expect.any(String))
    }
  })

  it('deve emitir o token de acesso em nome do usuário autenticado (RNF005)', async () => {
    const user = await createRegisteredUser()

    const result = await sut.execute({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accessToken).toBe(`${FakeAccessTokenGenerator.PREFIX}${user.id.toString()}`)
    }
  })

  it('deve persistir o token de renovação vinculado ao usuário (RN004)', async () => {
    const user = await createRegisteredUser()

    await sut.execute({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(refreshTokensRepository.items).toHaveLength(1)
    expect(refreshTokensRepository.items[0].userId.toString()).toBe(user.id.toString())
  })

  it('deve persistir apenas o hash do token de renovação, nunca o token entregue ao usuário', async () => {
    await createRegisteredUser()

    const result = await sut.execute({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(refreshTokensRepository.items[0].tokenHash).not.toBe(result.value.refreshToken)
      expect(refreshTokensRepository.items[0].tokenHash).toBe(refreshTokenGenerator.hash(result.value.refreshToken))
    }
  })

  it('deve expirar o token de renovação conforme o prazo configurado (RN006)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-29T12:00:00.000Z'))

    await createRegisteredUser()

    await sut.execute({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(refreshTokensRepository.items[0].expiresAt).toEqual(new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_SECONDS * MILLISECONDS_IN_SECOND))
  })

  it('deve emitir um token de renovação distinto a cada autenticação (RN007)', async () => {
    await createRegisteredUser()

    const firstResult = await sut.execute({ email: 'fulano@exemplo.com', password: 'senha-secreta' })
    const secondResult = await sut.execute({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(firstResult.isRight()).toBe(true)
    expect(secondResult.isRight()).toBe(true)
    if (firstResult.isRight() && secondResult.isRight()) {
      expect(firstResult.value.refreshToken).not.toBe(secondResult.value.refreshToken)
    }
    expect(refreshTokensRepository.items).toHaveLength(2)
  })

  it('deve autenticar quando o e-mail informado difere apenas em caixa e espaços (RN004)', async () => {
    await createRegisteredUser()

    const result = await sut.execute({ email: '  Fulano@Exemplo.COM  ', password: 'senha-secreta' })

    expect(result.isRight()).toBe(true)
  })

  it('deve retornar InvalidCredentialsError quando o e-mail não está cadastrado (RN004)', async () => {
    const result = await sut.execute({ email: 'ninguem@exemplo.com', password: 'senha-secreta' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCredentialsError)
    }
    expect(refreshTokensRepository.items).toHaveLength(0)
  })

  it('deve retornar InvalidCredentialsError quando a senha não confere com o hash armazenado (RN004, RNF006)', async () => {
    await createRegisteredUser()

    const result = await sut.execute({ email: 'fulano@exemplo.com', password: 'senha-errada' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCredentialsError)
    }
    expect(refreshTokensRepository.items).toHaveLength(0)
  })

  it('deve retornar InvalidCredentialsError quando o e-mail informado é inválido, sem revelar o motivo (RN004)', async () => {
    const result = await sut.execute({ email: 'fulano-exemplo.com', password: 'senha-secreta' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCredentialsError)
    }
  })

  it('deve responder com a mesma mensagem para e-mail inexistente e senha incorreta (RN004)', async () => {
    await createRegisteredUser()

    const unknownEmailResult = await sut.execute({ email: 'ninguem@exemplo.com', password: 'senha-secreta' })
    const wrongPasswordResult = await sut.execute({ email: 'fulano@exemplo.com', password: 'senha-errada' })

    expect(unknownEmailResult.isLeft()).toBe(true)
    expect(wrongPasswordResult.isLeft()).toBe(true)
    if (unknownEmailResult.isLeft() && wrongPasswordResult.isLeft()) {
      expect(unknownEmailResult.value.message).toBe(wrongPasswordResult.value.message)
    }
  })
})
