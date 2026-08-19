import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { EmailAlreadyInUseError } from '@domain/user/application/use-cases/errors/email-already-in-use-error'
import { UpdateUserProfileUseCase } from '@domain/user/application/use-cases/update-user-profile'
import { User } from '@domain/user/enterprise/entities/user'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { makeUser } from '@tests/factories/make-user'

let usersRepository: InMemoryUsersRepository
let sut: UpdateUserProfileUseCase

describe('Atualizar perfil do usuário', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    sut = new UpdateUserProfileUseCase(usersRepository)
  })

  it('deve atualizar o nome e o e-mail do próprio usuário (RN011)', async () => {
    const user = makeUser({ name: 'Fulano de Tal', email: Email.create('fulano@exemplo.com') })

    await usersRepository.create(user)

    const result = await sut.execute({ userId: user.id.toString(), name: 'Fulano Atualizado', email: 'atualizado@exemplo.com' })

    expect(result.isRight()).toBe(true)
    expect(usersRepository.items[0].name).toBe('Fulano Atualizado')
    expect(usersRepository.items[0].email.value).toBe('atualizado@exemplo.com')
  })

  it('deve registrar a data de atualização do usuário', async () => {
    const user = makeUser()

    await usersRepository.create(user)

    await sut.execute({ userId: user.id.toString(), name: 'Fulano Atualizado', email: 'atualizado@exemplo.com' })

    expect(usersRepository.items[0].updatedAt).toBeInstanceOf(Date)
  })

  it('deve preservar o hash da senha ao atualizar o perfil', async () => {
    const user = makeUser({ passwordHash: 'hash-original' })

    await usersRepository.create(user)

    await sut.execute({ userId: user.id.toString(), name: 'Fulano Atualizado', email: 'atualizado@exemplo.com' })

    expect(usersRepository.items[0].passwordHash).toBe('hash-original')
  })

  it('deve normalizar o e-mail informado antes de persistir', async () => {
    const user = makeUser()

    await usersRepository.create(user)

    await sut.execute({ userId: user.id.toString(), name: 'Fulano de Tal', email: '  Atualizado@Exemplo.COM  ' })

    expect(usersRepository.items[0].email.value).toBe('atualizado@exemplo.com')
  })

  it('deve aceitar a manutenção do mesmo e-mail do próprio usuário (RN002)', async () => {
    const user = makeUser({ email: Email.create('fulano@exemplo.com') })

    await usersRepository.create(user)

    const result = await sut.execute({ userId: user.id.toString(), name: 'Fulano Atualizado', email: 'fulano@exemplo.com' })

    expect(result.isRight()).toBe(true)
    expect(usersRepository.items[0].name).toBe('Fulano Atualizado')
  })

  it('deve retornar EmailAlreadyInUseError quando o e-mail pertence a outro usuário (RN002)', async () => {
    const user = makeUser({ email: Email.create('fulano@exemplo.com') })

    await usersRepository.create(user)
    await usersRepository.create(makeUser({ email: Email.create('beltrano@exemplo.com') }))

    const result = await sut.execute({ userId: user.id.toString(), name: 'Fulano de Tal', email: 'beltrano@exemplo.com' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(EmailAlreadyInUseError)
    }
    expect(usersRepository.items[0].email.value).toBe('fulano@exemplo.com')
  })

  it('deve retornar EmailAlreadyInUseError quando o e-mail pertence a um usuário excluído logicamente (RN014)', async () => {
    const user = makeUser({ email: Email.create('fulano@exemplo.com') })

    await usersRepository.create(user)
    await usersRepository.create(makeUser({ email: Email.create('beltrano@exemplo.com'), deletedAt: new Date() }))

    const result = await sut.execute({ userId: user.id.toString(), name: 'Fulano de Tal', email: 'beltrano@exemplo.com' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(EmailAlreadyInUseError)
    }
  })

  it('deve retornar ResourceNotFoundError quando o usuário não existe', async () => {
    const result = await sut.execute({ userId: new UniqueEntityID().toString(), name: 'Fulano de Tal', email: 'fulano@exemplo.com' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    }
  })

  it('deve retornar ResourceNotFoundError quando o usuário foi excluído logicamente (RN012, RN013)', async () => {
    const user = makeUser({ deletedAt: new Date() })

    await usersRepository.create(user)

    const result = await sut.execute({ userId: user.id.toString(), name: 'Fulano Atualizado', email: 'atualizado@exemplo.com' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    }
    expect(usersRepository.items[0].name).not.toBe('Fulano Atualizado')
  })

  it('deve lançar InvariantError quando o e-mail informado é inválido', async () => {
    const user = makeUser({ email: Email.create('fulano@exemplo.com') })

    await usersRepository.create(user)

    await expect(sut.execute({ userId: user.id.toString(), name: 'Fulano de Tal', email: 'fulano-exemplo.com' })).rejects.toBeInstanceOf(InvariantError)
    expect(usersRepository.items[0].email.value).toBe('fulano@exemplo.com')
  })

  it('deve lançar InvariantError quando o nome é vazio (RN001)', async () => {
    const user = makeUser({ name: 'Fulano de Tal' })

    await usersRepository.create(user)

    await expect(sut.execute({ userId: user.id.toString(), name: '   ', email: 'atualizado@exemplo.com' })).rejects.toBeInstanceOf(InvariantError)
  })

  it('deve lançar InvariantError quando o nome ultrapassa o tamanho máximo', async () => {
    const user = makeUser()

    await usersRepository.create(user)

    const request = { userId: user.id.toString(), name: 'a'.repeat(User.NAME_MAX_LENGTH + 1), email: 'atualizado@exemplo.com' }

    await expect(sut.execute(request)).rejects.toBeInstanceOf(InvariantError)
  })

  it('deve definir a preferência de situação padrão de transação quando informada (RN049)', async () => {
    const user = makeUser()

    await usersRepository.create(user)

    const result = await sut.execute({ userId: user.id.toString(), name: user.name, email: user.email.value, defaultTransactionStatus: 'PLANNED' })

    expect(result.isRight()).toBe(true)
    expect(usersRepository.items[0].defaultTransactionStatus).toBe('PLANNED')
  })

  it('deve preservar a preferência de situação padrão de transação quando não informada (RN049)', async () => {
    const user = makeUser({ defaultTransactionStatus: 'SETTLED' })

    await usersRepository.create(user)

    await sut.execute({ userId: user.id.toString(), name: 'Fulano Atualizado', email: 'atualizado@exemplo.com' })

    expect(usersRepository.items[0].defaultTransactionStatus).toBe('SETTLED')
  })

  it('deve limpar a preferência de situação padrão de transação quando informada como null (RN049)', async () => {
    const user = makeUser({ defaultTransactionStatus: 'SETTLED' })

    await usersRepository.create(user)

    await sut.execute({ userId: user.id.toString(), name: user.name, email: user.email.value, defaultTransactionStatus: null })

    expect(usersRepository.items[0].defaultTransactionStatus).toBeNull()
  })
})
