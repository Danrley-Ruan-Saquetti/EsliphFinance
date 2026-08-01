import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { Money } from '@core/value-objects/money'
import { CreateAccountUseCase } from '@domain/account/application/use-cases/create-account'
import { InvalidAccountGroupTypeError } from '@domain/account/application/use-cases/errors/invalid-account-group-type-error'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountsRepository: InMemoryAccountsRepository
let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: CreateAccountUseCase

describe('Criar conta', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    accountsRepository = new InMemoryAccountsRepository(accountGroupsRepository)
    sut = new CreateAccountUseCase(accountsRepository, accountGroupsRepository)
  })

  it('deve criar a conta e persisti-la no repositório (RN018)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId), type: 'DEFAULT' })

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({
      ownerId,
      accountGroupId: accountGroup.id.toString(),
      name: 'Carteira',
      initialBalance: Money.fromCents(15000),
      icon: 'wallet',
      color: '#1E88E5',
    })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items).toHaveLength(1)
    expect(accountsRepository.items[0].name).toBe('Carteira')
    expect(accountsRepository.items[0].accountGroupId.toString()).toBe(accountGroup.id.toString())
    expect(accountsRepository.items[0].initialBalance.amountInCents).toBe(15000)
    expect(accountsRepository.items[0].icon).toBe('wallet')
    expect(accountsRepository.items[0].color).toBe('#1E88E5')
  })

  it('deve criar a conta com o saldo inicial zerado quando ele não for informado (RN018)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId) })

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({ ownerId, accountGroupId: accountGroup.id.toString(), name: 'Carteira', color: '#1E88E5' })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items[0].initialBalance.amountInCents).toBe(0)
  })

  it('deve criar a conta com o saldo inicial negativo (RN018)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId) })

    await accountGroupsRepository.create(accountGroup)

    await sut.execute({
      ownerId,
      accountGroupId: accountGroup.id.toString(),
      name: 'Conta corrente',
      initialBalance: Money.fromCents(-25050),
      color: '#1E88E5',
    })

    expect(accountsRepository.items[0].initialBalance.amountInCents).toBe(-25050)
  })

  it('deve vincular a conta ao usuário informado (RN010)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId) })

    await accountGroupsRepository.create(accountGroup)

    await sut.execute({ ownerId, accountGroupId: accountGroup.id.toString(), name: 'Carteira', color: '#1E88E5' })

    expect(accountsRepository.items[0].ownerId.toString()).toBe(ownerId)
  })

  it('deve retornar ResourceNotFoundError quando o grupo de contas não existir (RN018)', async () => {
    const result = await sut.execute({
      ownerId: new UniqueEntityID().toString(),
      accountGroupId: new UniqueEntityID().toString(),
      name: 'Carteira',
      color: '#1E88E5',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    expect(accountsRepository.items).toHaveLength(0)
  })

  it('deve retornar ResourceNotFoundError quando o grupo de contas for de outro usuário (RN010, RN011)', async () => {
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID() })

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({
      ownerId: new UniqueEntityID().toString(),
      accountGroupId: accountGroup.id.toString(),
      name: 'Carteira',
      color: '#1E88E5',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    expect(accountsRepository.items).toHaveLength(0)
  })

  it('deve criar a conta de cartão de crédito com o limite, o dia de fechamento e o dia de vencimento (RN019)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId), type: 'CREDIT_CARD' })

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({
      ownerId,
      accountGroupId: accountGroup.id.toString(),
      name: 'Cartão',
      color: '#1E88E5',
      creditCard: { limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 },
    })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items).toHaveLength(1)
    expect(accountsRepository.items[0].creditCard?.limit.amountInCents).toBe(500000)
    expect(accountsRepository.items[0].creditCard?.closingDay.day).toBe(20)
    expect(accountsRepository.items[0].creditCard?.dueDay.day).toBe(28)
    expect(accountsRepository.items[0].initialBalance.amountInCents).toBe(0)
  })

  it('deve retornar InvalidAccountGroupTypeError quando o grupo for do tipo "Cartão de Crédito" e os dados do cartão não forem informados (RN019)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId), type: 'CREDIT_CARD' })

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({ ownerId, accountGroupId: accountGroup.id.toString(), name: 'Cartão', color: '#1E88E5' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidAccountGroupTypeError)
    expect(accountsRepository.items).toHaveLength(0)
  })

  it('deve retornar InvalidAccountGroupTypeError quando o grupo for do tipo "Padrão" e os dados do cartão forem informados (RN019)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId), type: 'DEFAULT' })

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({
      ownerId,
      accountGroupId: accountGroup.id.toString(),
      name: 'Carteira',
      color: '#1E88E5',
      creditCard: { limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidAccountGroupTypeError)
    expect(accountsRepository.items).toHaveLength(0)
  })

  it('deve lançar InvariantError quando a conta de cartão de crédito receber saldo inicial (RN022)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId), type: 'CREDIT_CARD' })

    await accountGroupsRepository.create(accountGroup)

    await expect(
      sut.execute({
        ownerId,
        accountGroupId: accountGroup.id.toString(),
        name: 'Cartão',
        initialBalance: Money.fromCents(15000),
        color: '#1E88E5',
        creditCard: { limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 },
      }),
    ).rejects.toThrow(InvariantError)

    expect(accountsRepository.items).toHaveLength(0)
  })

  it('deve lançar InvariantError quando o dia de fechamento ou de vencimento estiver fora do intervalo de 1 a 31 (RN020)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId), type: 'CREDIT_CARD' })

    await accountGroupsRepository.create(accountGroup)

    await expect(
      sut.execute({
        ownerId,
        accountGroupId: accountGroup.id.toString(),
        name: 'Cartão',
        color: '#1E88E5',
        creditCard: { limit: Money.fromCents(500000), closingDay: 32, dueDay: 28 },
      }),
    ).rejects.toThrow(InvariantError)

    expect(accountsRepository.items).toHaveLength(0)
  })

  it('deve lançar InvariantError quando o nome for vazio (RN018)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId) })

    await accountGroupsRepository.create(accountGroup)

    await expect(sut.execute({ ownerId, accountGroupId: accountGroup.id.toString(), name: '   ', color: '#1E88E5' })).rejects.toThrow(InvariantError)

    expect(accountsRepository.items).toHaveLength(0)
  })
})
