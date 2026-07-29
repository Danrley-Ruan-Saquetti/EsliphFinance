import { beforeEach, describe, expect, it } from 'vitest'

import { InvariantError } from '@core/errors/invariant-error'
import { CreateUserUseCase } from '@domain/user/application/use-cases/create-user'
import { EmailAlreadyInUseError } from '@domain/user/application/use-cases/errors/email-already-in-use-error'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { Password } from '@domain/user/enterprise/value-objects/password'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { FakeHasher } from '@tests/cryptography/fake-hasher'
import { makeUser } from '@tests/factories/make-user'

let usersRepository: InMemoryUsersRepository
let hasher: FakeHasher
let sut: CreateUserUseCase

describe('Cadastrar usuário', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    hasher = new FakeHasher()
    sut = new CreateUserUseCase(usersRepository, hasher)
  })

  it('deve cadastrar o usuário com nome, e-mail e senha (RN001)', async () => {
    const result = await sut.execute({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.user.name).toBe('Fulano de Tal')
      expect(result.value.user.email.value).toBe('fulano@exemplo.com')
    }
    expect(usersRepository.items).toHaveLength(1)
  })

  it('deve persistir apenas o hash da senha, nunca a senha em texto puro (RNF006)', async () => {
    await sut.execute({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(usersRepository.items[0].passwordHash).toBe(`senha-secreta${FakeHasher.SUFFIX}`)
    expect(usersRepository.items[0].passwordHash).not.toBe('senha-secreta')
  })

  it('deve normalizar o e-mail antes de persistir', async () => {
    await sut.execute({ name: 'Fulano de Tal', email: '  Fulano@Exemplo.COM  ', password: 'senha-secreta' })

    expect(usersRepository.items[0].email.value).toBe('fulano@exemplo.com')
  })

  it('deve retornar EmailAlreadyInUseError quando o e-mail já está cadastrado (RN002)', async () => {
    await usersRepository.create(makeUser({ email: Email.create('fulano@exemplo.com') }))

    const result = await sut.execute({ name: 'Outro Fulano', email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(EmailAlreadyInUseError)
    }
    expect(usersRepository.items).toHaveLength(1)
  })

  it('deve retornar EmailAlreadyInUseError quando o e-mail já cadastrado difere apenas em caixa (RN002)', async () => {
    await usersRepository.create(makeUser({ email: Email.create('fulano@exemplo.com') }))

    const result = await sut.execute({ name: 'Outro Fulano', email: 'FULANO@EXEMPLO.COM', password: 'senha-secreta' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(EmailAlreadyInUseError)
    }
  })

  it('deve retornar EmailAlreadyInUseError quando o e-mail pertence a um usuário excluído logicamente (RN014)', async () => {
    await usersRepository.create(makeUser({ email: Email.create('fulano@exemplo.com'), deletedAt: new Date() }))

    const result = await sut.execute({ name: 'Outro Fulano', email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(EmailAlreadyInUseError)
    }
    expect(usersRepository.items).toHaveLength(1)
  })

  it('deve lançar InvariantError quando a senha tem menos que o mínimo de caracteres (RN003)', async () => {
    const request = { name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'a'.repeat(Password.MIN_LENGTH - 1) }

    await expect(sut.execute(request)).rejects.toBeInstanceOf(InvariantError)
    expect(usersRepository.items).toHaveLength(0)
  })

  it('deve cadastrar o usuário quando a senha tem exatamente o mínimo de caracteres (RN003)', async () => {
    const result = await sut.execute({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'a'.repeat(Password.MIN_LENGTH) })

    expect(result.isRight()).toBe(true)
    expect(usersRepository.items).toHaveLength(1)
  })

  it('deve lançar InvariantError quando o e-mail é inválido', async () => {
    const request = { name: 'Fulano de Tal', email: 'fulano-exemplo.com', password: 'senha-secreta' }

    await expect(sut.execute(request)).rejects.toBeInstanceOf(InvariantError)
    expect(usersRepository.items).toHaveLength(0)
  })

  it('deve lançar InvariantError quando o nome é vazio (RN001)', async () => {
    const request = { name: '   ', email: 'fulano@exemplo.com', password: 'senha-secreta' }

    await expect(sut.execute(request)).rejects.toBeInstanceOf(InvariantError)
    expect(usersRepository.items).toHaveLength(0)
  })
})
