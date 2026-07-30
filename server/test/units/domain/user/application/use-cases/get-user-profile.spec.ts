import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { GetUserProfileUseCase } from '@domain/user/application/use-cases/get-user-profile'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { makeUser } from '@tests/factories/make-user'

let usersRepository: InMemoryUsersRepository
let sut: GetUserProfileUseCase

describe('Consultar perfil do usuário', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    sut = new GetUserProfileUseCase(usersRepository)
  })

  it('deve retornar os dados do próprio usuário autenticado (RN011)', async () => {
    const user = makeUser({ name: 'Fulano de Tal', email: Email.create('fulano@exemplo.com') })

    await usersRepository.create(user)

    const result = await sut.execute({ userId: user.id.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.user.name).toBe('Fulano de Tal')
      expect(result.value.user.email.value).toBe('fulano@exemplo.com')
    }
  })

  it('deve retornar ResourceNotFoundError quando o usuário não existe', async () => {
    const result = await sut.execute({ userId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    }
  })

  it('deve retornar ResourceNotFoundError quando o usuário foi excluído logicamente (RN012, RN013)', async () => {
    const user = makeUser({ deletedAt: new Date() })

    await usersRepository.create(user)

    const result = await sut.execute({ userId: user.id.toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    }
  })

  it('deve retornar ResourceNotFoundError quando o identificador é de outro registro inexistente e há usuários cadastrados (RN011)', async () => {
    await usersRepository.create(makeUser())

    const result = await sut.execute({ userId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    }
  })
})
