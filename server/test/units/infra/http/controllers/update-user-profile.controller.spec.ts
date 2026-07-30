import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { EmailAlreadyInUseError } from '@domain/user/application/use-cases/errors/email-already-in-use-error'
import { UpdateUserProfileUseCase } from '@domain/user/application/use-cases/update-user-profile'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { UpdateUserProfileController } from '@infra/http/controllers/update-user-profile.controller'
import { makeUser } from '@tests/factories/make-user'

let usersRepository: InMemoryUsersRepository
let sut: UpdateUserProfileController

describe('UpdateUserProfileController', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    sut = new UpdateUserProfileController(new UpdateUserProfileUseCase(usersRepository))
  })

  it('deve devolver o usuário atualizado sem o hash da senha (RN011, RNF006)', async () => {
    const user = makeUser({ passwordHash: 'hash-da-senha' })

    await usersRepository.create(user)

    const response = await sut.handle({ id: user.id.toString() }, { name: 'Fulano Atualizado', email: 'atualizado@exemplo.com' })

    expect(response.user).toEqual({
      id: user.id.toString(),
      name: 'Fulano Atualizado',
      email: 'atualizado@exemplo.com',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    expect(JSON.stringify(response)).not.toContain('hash-da-senha')
  })

  it('deve lançar EmailAlreadyInUseError quando o e-mail pertence a outro usuário (RN002)', async () => {
    const user = makeUser({ email: Email.create('fulano@exemplo.com') })

    await usersRepository.create(user)
    await usersRepository.create(makeUser({ email: Email.create('beltrano@exemplo.com') }))

    const request = { name: 'Fulano de Tal', email: 'beltrano@exemplo.com' }

    await expect(sut.handle({ id: user.id.toString() }, request)).rejects.toBeInstanceOf(EmailAlreadyInUseError)
  })

  it('deve lançar ResourceNotFoundError quando o usuário autenticado não existe', async () => {
    const request = { name: 'Fulano de Tal', email: 'fulano@exemplo.com' }

    await expect(sut.handle({ id: new UniqueEntityID().toString() }, request)).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
