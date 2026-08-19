import { beforeEach, describe, expect, it } from 'vitest'

import { CreateUserUseCase } from '@domain/user/application/use-cases/create-user'
import { EmailAlreadyInUseError } from '@domain/user/application/use-cases/errors/email-already-in-use-error'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { CreateUserController } from '@infra/http/controllers/create-user.controller'
import { FakeHasher } from '@tests/cryptography/fake-hasher'
import { makeUser } from '@tests/factories/make-user'

let usersRepository: InMemoryUsersRepository
let sut: CreateUserController

describe('CreateUserController', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    sut = new CreateUserController(new CreateUserUseCase(usersRepository, new FakeHasher()))
  })

  it('deve devolver o usuário criado sem o hash da senha (RNF006)', async () => {
    const response = await sut.handle({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(response.user).toEqual({
      id: usersRepository.items[0].id.toString(),
      name: 'Fulano de Tal',
      email: 'fulano@exemplo.com',
      defaultTransactionStatus: null,
      createdAt: usersRepository.items[0].createdAt,
      updatedAt: null,
    })
    expect(JSON.stringify(response)).not.toContain('senha-secreta')
  })

  it('deve lançar EmailAlreadyInUseError quando o e-mail já está cadastrado (RN002)', async () => {
    await usersRepository.create(makeUser({ email: Email.create('fulano@exemplo.com') }))

    const request = { name: 'Outro Fulano', email: 'fulano@exemplo.com', password: 'senha-secreta' }

    await expect(sut.handle(request)).rejects.toBeInstanceOf(EmailAlreadyInUseError)
  })
})
