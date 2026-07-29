import { beforeEach, describe, expect, it } from 'vitest'

import { AuthenticateUserUseCase } from '@domain/user/application/use-cases/authenticate-user'
import { InvalidCredentialsError } from '@domain/user/application/use-cases/errors/invalid-credentials-error'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { InMemoryRefreshTokensRepository } from '@infra/database/in-memory/in-memory-refresh-tokens-repository'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { AuthenticateUserController } from '@infra/http/controllers/authenticate-user.controller'
import { FakeAccessTokenGenerator } from '@tests/cryptography/fake-access-token-generator'
import { FakeHasher } from '@tests/cryptography/fake-hasher'
import { FakeRefreshTokenGenerator } from '@tests/cryptography/fake-refresh-token-generator'
import { makeUser } from '@tests/factories/make-user'

const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 2592000

let usersRepository: InMemoryUsersRepository
let refreshTokensRepository: InMemoryRefreshTokensRepository
let hasher: FakeHasher
let sut: AuthenticateUserController

describe('AuthenticateUserController', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    hasher = new FakeHasher()
    sut = new AuthenticateUserController(
      new AuthenticateUserUseCase(
        usersRepository,
        refreshTokensRepository,
        hasher,
        new FakeAccessTokenGenerator(),
        new FakeRefreshTokenGenerator(),
        REFRESH_TOKEN_EXPIRES_IN_SECONDS,
      ),
    )
  })

  it('deve devolver o par de tokens do usuário autenticado (RN004)', async () => {
    const user = makeUser({ email: Email.create('fulano@exemplo.com'), passwordHash: await hasher.hash('senha-secreta') })

    await usersRepository.create(user)

    const response = await sut.handle({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(response).toEqual({
      accessToken: `${FakeAccessTokenGenerator.PREFIX}${user.id.toString()}`,
      refreshToken: expect.any(String) as string,
    })
  })

  it('deve lançar InvalidCredentialsError quando as credenciais não conferem (RN004)', async () => {
    const user = makeUser({ email: Email.create('fulano@exemplo.com'), passwordHash: await hasher.hash('senha-secreta') })

    await usersRepository.create(user)

    await expect(sut.handle({ email: 'fulano@exemplo.com', password: 'senha-errada' })).rejects.toBeInstanceOf(InvalidCredentialsError)
  })
})
