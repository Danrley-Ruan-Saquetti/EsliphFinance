import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Money } from '@core/value-objects/money'
import { Account } from '@domain/account/enterprise/entities/account'
import { CreditCardSettings } from '@domain/account/enterprise/value-objects/credit-card-settings'

describe('Account', () => {
  it('deve criar a conta com o nome, o grupo, o saldo inicial, o ícone e a cor informados (RN018)', () => {
    const ownerId = new UniqueEntityID()
    const accountGroupId = new UniqueEntityID()

    const account = Account.create({ ownerId, accountGroupId, name: 'Carteira', initialBalance: Money.fromCents(15000), icon: 'wallet', color: '#1E88E5' })

    expect(account.ownerId).toBe(ownerId)
    expect(account.accountGroupId).toBe(accountGroupId)
    expect(account.name).toBe('Carteira')
    expect(account.initialBalance.amountInCents).toBe(15000)
    expect(account.icon).toBe('wallet')
    expect(account.color).toBe('#1E88E5')
    expect(account.creditCard).toBeNull()
    expect(account.createdAt).toBeInstanceOf(Date)
    expect(account.updatedAt).toBeUndefined()
  })

  it('deve criar a conta com o limite, o dia de fechamento e o dia de vencimento do cartão de crédito (RN019)', () => {
    const creditCard = CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 })

    const account = Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Cartão', color: '#1E88E5', creditCard })

    expect(account.creditCard).toBe(creditCard)
    expect(account.initialBalance.amountInCents).toBe(0)
  })

  it('deve lançar InvariantError quando a conta de cartão de crédito receber saldo inicial (RN022)', () => {
    const creditCard = CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 })

    expect(() =>
      Account.create({
        ownerId: new UniqueEntityID(),
        accountGroupId: new UniqueEntityID(),
        name: 'Cartão',
        initialBalance: Money.fromCents(15000),
        color: '#1E88E5',
        creditCard,
      }),
    ).toThrow(InvariantError)
  })

  it('deve assumir o saldo inicial zerado quando ele não for informado (RN018)', () => {
    const account = Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Carteira', color: '#1E88E5' })

    expect(account.initialBalance.amountInCents).toBe(0)
  })

  it('deve assumir o ícone padrão quando ele não for informado (RN018)', () => {
    const account = Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Carteira', color: '#1E88E5' })

    expect(account.icon).toBe(Account.DEFAULT_ICON)
  })

  it('deve aceitar o saldo inicial negativo (RN018)', () => {
    const account = Account.create({
      ownerId: new UniqueEntityID(),
      accountGroupId: new UniqueEntityID(),
      name: 'Conta corrente',
      initialBalance: Money.fromCents(-25050),
      color: '#1E88E5',
    })

    expect(account.initialBalance.amountInCents).toBe(-25050)
  })

  it('deve remover os espaços das extremidades do nome', () => {
    const account = Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: '  Carteira  ', color: '#1E88E5' })

    expect(account.name).toBe('Carteira')
  })

  it('deve lançar InvariantError quando o nome for vazio (RN018)', () => {
    expect(() => Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: '   ', color: '#1E88E5' })).toThrow(InvariantError)
  })

  it('deve aceitar o nome com o tamanho máximo permitido', () => {
    const name = 'a'.repeat(Account.NAME_MAX_LENGTH)

    const account = Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name, color: '#1E88E5' })

    expect(account.name).toBe(name)
  })

  it('deve lançar InvariantError quando o nome exceder o tamanho máximo', () => {
    const name = 'a'.repeat(Account.NAME_MAX_LENGTH + 1)

    expect(() => Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name, color: '#1E88E5' })).toThrow(InvariantError)
  })

  it('deve normalizar a cor para letras maiúsculas (RN018)', () => {
    const account = Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Carteira', color: '  #1e88e5  ' })

    expect(account.color).toBe('#1E88E5')
  })

  it('deve lançar InvariantError quando a cor estiver fora do formato hexadecimal #RRGGBB (RN018)', () => {
    expect(() => Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Carteira', color: '1E88E5' })).toThrow(
      InvariantError,
    )
    expect(() => Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Carteira', color: '#1E8' })).toThrow(
      InvariantError,
    )
    expect(() => Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Carteira', color: '#GGGGGG' })).toThrow(
      InvariantError,
    )
  })

  it('deve normalizar o ícone para letras minúsculas (RN018)', () => {
    const account = Account.create({
      ownerId: new UniqueEntityID(),
      accountGroupId: new UniqueEntityID(),
      name: 'Carteira',
      icon: '  Credit-Card  ',
      color: '#1E88E5',
    })

    expect(account.icon).toBe('credit-card')
  })

  it('deve lançar InvariantError quando o ícone estiver fora do formato permitido (RN018)', () => {
    expect(() =>
      Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Carteira', icon: 'credit card', color: '#1E88E5' }),
    ).toThrow(InvariantError)
    expect(() => Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Carteira', icon: '', color: '#1E88E5' })).toThrow(
      InvariantError,
    )
  })

  it('deve lançar InvariantError quando o ícone exceder o tamanho máximo', () => {
    const icon = 'a'.repeat(Account.ICON_MAX_LENGTH + 1)

    expect(() => Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Carteira', icon, color: '#1E88E5' })).toThrow(
      InvariantError,
    )
  })

  it('deve criar a conta sem data de arquivamento (RN024)', () => {
    const account = Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Carteira', color: '#1E88E5' })

    expect(account.archivedAt).toBeUndefined()
    expect(account.isArchived).toBe(false)
  })

  it('deve reconhecer a conta como arquivada quando possuir data de arquivamento (RN024, RN025)', () => {
    const archivedAt = new Date('2026-03-10T12:00:00.000Z')

    const account = Account.create({ ownerId: new UniqueEntityID(), accountGroupId: new UniqueEntityID(), name: 'Carteira', color: '#1E88E5', archivedAt })

    expect(account.archivedAt).toEqual(archivedAt)
    expect(account.isArchived).toBe(true)
  })
})
