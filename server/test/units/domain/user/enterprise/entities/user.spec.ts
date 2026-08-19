import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { User } from '@domain/user/enterprise/entities/user'
import { DefaultTransactionStatus } from '@domain/user/enterprise/value-objects/default-transaction-status'
import { Email } from '@domain/user/enterprise/value-objects/email'

const email = Email.create('fulano@exemplo.com')

describe('User', () => {
  it('deve criar o usuário com nome, e-mail e hash da senha (RN001)', () => {
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha' })

    expect(user.name).toBe('Fulano de Tal')
    expect(user.email).toBe(email)
    expect(user.passwordHash).toBe('hash-da-senha')
    expect(user.createdAt).toBeInstanceOf(Date)
    expect(user.updatedAt).toBeUndefined()
    expect(user.deletedAt).toBeUndefined()
  })

  it('deve preservar o identificador informado', () => {
    const id = new UniqueEntityID()
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha' }, id)

    expect(user.id.equals(id)).toBe(true)
  })

  it('deve preservar as datas informadas', () => {
    const createdAt = new Date(2026, 0, 1)
    const updatedAt = new Date(2026, 0, 2)
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha', createdAt, updatedAt })

    expect(user.createdAt).toBe(createdAt)
    expect(user.updatedAt).toBe(updatedAt)
  })

  it('deve remover os espaços das pontas do nome', () => {
    const user = User.create({ name: '  Fulano de Tal  ', email, passwordHash: 'hash-da-senha' })

    expect(user.name).toBe('Fulano de Tal')
  })

  it('deve lançar InvariantError quando o nome é vazio (RN001)', () => {
    expect(() => User.create({ name: '   ', email, passwordHash: 'hash-da-senha' })).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o nome ultrapassa o tamanho máximo', () => {
    expect(() => User.create({ name: 'a'.repeat(User.NAME_MAX_LENGTH + 1), email, passwordHash: 'hash-da-senha' })).toThrow(InvariantError)
  })

  it('deve aceitar o nome com o tamanho máximo', () => {
    const user = User.create({ name: 'a'.repeat(User.NAME_MAX_LENGTH), email, passwordHash: 'hash-da-senha' })

    expect(user.name).toHaveLength(User.NAME_MAX_LENGTH)
  })

  it('deve indicar que o usuário não está excluído quando não tem data de exclusão (RN012)', () => {
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha' })

    expect(user.isDeleted).toBe(false)
  })

  it('deve indicar que o usuário está excluído quando tem data de exclusão (RN012)', () => {
    const deletedAt = new Date(2026, 0, 3)
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha', deletedAt })

    expect(user.isDeleted).toBe(true)
    expect(user.deletedAt).toBe(deletedAt)
  })

  it('deve alterar o nome e registrar a data de atualização', () => {
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha' })

    user.changeName('  Fulano Atualizado  ')

    expect(user.name).toBe('Fulano Atualizado')
    expect(user.updatedAt).toBeInstanceOf(Date)
  })

  it('deve lançar InvariantError quando o nome alterado é vazio (RN001)', () => {
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha' })

    expect(() => user.changeName('   ')).toThrow(InvariantError)
    expect(user.name).toBe('Fulano de Tal')
  })

  it('deve lançar InvariantError quando o nome alterado ultrapassa o tamanho máximo', () => {
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha' })

    expect(() => user.changeName('a'.repeat(User.NAME_MAX_LENGTH + 1))).toThrow(InvariantError)
  })

  it('deve alterar o e-mail e registrar a data de atualização (RN002)', () => {
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha' })
    const updatedEmail = Email.create('atualizado@exemplo.com')

    user.changeEmail(updatedEmail)

    expect(user.email).toBe(updatedEmail)
    expect(user.updatedAt).toBeInstanceOf(Date)
  })

  it('deve preservar o hash da senha ao alterar nome e e-mail', () => {
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha' })

    user.changeName('Fulano Atualizado')
    user.changeEmail(Email.create('atualizado@exemplo.com'))

    expect(user.passwordHash).toBe('hash-da-senha')
  })

  it('deve criar o usuário sem preferência de situação padrão de transação quando não informada (RN049)', () => {
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha' })

    expect(user.defaultTransactionStatus).toBeNull()
  })

  it('deve criar o usuário com a preferência de situação padrão de transação informada (RN049)', () => {
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha', defaultTransactionStatus: 'PLANNED' })

    expect(user.defaultTransactionStatus).toBe('PLANNED')
  })

  it('deve lançar InvariantError quando a preferência de situação padrão de transação estiver fora do domínio permitido (RN049)', () => {
    expect(() =>
      User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha', defaultTransactionStatus: 'INVALID' as DefaultTransactionStatus }),
    ).toThrow(InvariantError)
  })

  it('deve alterar a preferência de situação padrão de transação e registrar a data de atualização (RN049)', () => {
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha' })

    user.changeDefaultTransactionStatus('SETTLED')

    expect(user.defaultTransactionStatus).toBe('SETTLED')
    expect(user.updatedAt).toBeInstanceOf(Date)
  })

  it('deve limpar a preferência de situação padrão de transação quando alterada para null (RN049)', () => {
    const user = User.create({ name: 'Fulano de Tal', email, passwordHash: 'hash-da-senha', defaultTransactionStatus: 'PLANNED' })

    user.changeDefaultTransactionStatus(null)

    expect(user.defaultTransactionStatus).toBeNull()
  })
})
