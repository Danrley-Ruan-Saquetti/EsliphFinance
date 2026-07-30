import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { GetUserProfileUseCase } from '@domain/user/application/use-cases/get-user-profile'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { GetUserProfileController } from '@infra/http/controllers/get-user-profile.controller'
import { makeUser } from '@tests/factories/make-user'

let usersRepository: InMemoryUsersRepository
let sut: GetUserProfileController

describe('GetUserProfileController', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    sut = new GetUserProfileController(new GetUserProfileUseCase(usersRepository))
  })

  it('deve devolver os dados do usuário autenticado sem o hash da senha (RN011, RNF006)', async () => {
    const user = makeUser({ name: 'Fulano de Tal', email: Email.create('fulano@exemplo.com'), passwordHash: 'hash-da-senha' })

    await usersRepository.create(user)

    const response = await sut.handle({ id: user.id.toString() })

    expect(response.user).toEqual({
      id: user.id.toString(),
      name: 'Fulano de Tal',
      email: 'fulano@exemplo.com',
      createdAt: user.createdAt,
      updatedAt: null,
    })
    expect(JSON.stringify(response)).not.toContain('hash-da-senha')
  })

  it('deve lançar ResourceNotFoundError quando o usuário autenticado não existe', async () => {
    await expect(sut.handle({ id: new UniqueEntityID().toString() })).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
