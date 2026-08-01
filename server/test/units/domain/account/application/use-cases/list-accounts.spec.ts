import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Money } from '@core/value-objects/money'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'
import { ListAccountsUseCase } from '@domain/account/application/use-cases/list-accounts'
import { CreditCardSettings } from '@domain/account/enterprise/value-objects/credit-card-settings'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { makeAccount } from '@tests/factories/make-account'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let accountsRepository: InMemoryAccountsRepository
let sut: ListAccountsUseCase

async function createAccountGroup(ownerId: UniqueEntityID, type: AccountGroupType = 'DEFAULT'): Promise<AccountGroup> {
  const accountGroup = makeAccountGroup({ ownerId, type })

  await accountGroupsRepository.create(accountGroup)

  return accountGroup
}

describe('Listar contas', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    accountsRepository = new InMemoryAccountsRepository(accountGroupsRepository)
    sut = new ListAccountsUseCase(accountsRepository)
  })

  it('deve listar apenas as contas do usuário informado (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira' }))
    await accountsRepository.create(makeAccount({ name: 'Conta de outro usuário' }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts).toHaveLength(1)
      expect(result.value.accounts[0].account.name).toBe('Carteira')
    }
  })

  it('deve calcular o saldo da conta a partir do saldo inicial (RN021)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, initialBalance: Money.fromCents(123456) }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts[0].balance?.amountInCents).toBe(123456)
    }
  })

  it('deve calcular o saldo negativo da conta (RN018, RN021)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, initialBalance: Money.fromCents(-25050) }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts[0].balance?.amountInCents).toBe(-25050)
    }
  })

  it('deve devolver a conta de cartão de crédito sem saldo (RN022)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId, 'CREDIT_CARD')
    const creditCard = CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 })

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Cartão', creditCard }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts[0].balance).toBeNull()
    }
  })

  it('deve devolver o limite disponível da conta de cartão de crédito (RN023)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId, 'CREDIT_CARD')
    const creditCard = CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 })

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Cartão', creditCard }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts[0].availableLimit?.amountInCents).toBe(500000)
    }
  })

  it('deve devolver a conta comum sem limite disponível (RN022, RN023)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts[0].availableLimit).toBeNull()
    }
  })

  it('deve listar as contas do grupo informado quando o filtro por grupo for usado', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)
    const anotherAccountGroup = await createAccountGroup(ownerId)

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira' }))
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: anotherAccountGroup.id, name: 'Poupança' }))

    const result = await sut.execute({ ownerId: ownerId.toString(), accountGroupId: accountGroup.id.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts).toHaveLength(1)
      expect(result.value.accounts[0].account.name).toBe('Carteira')
    }
  })

  it('deve listar as contas do tipo de grupo informado quando o filtro por tipo de grupo for usado (RN015)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)
    const creditCardAccountGroup = await createAccountGroup(ownerId, 'CREDIT_CARD')
    const creditCard = CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 })

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira' }))
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: creditCardAccountGroup.id, name: 'Cartão', creditCard }))

    const result = await sut.execute({ ownerId: ownerId.toString(), accountGroupType: 'CREDIT_CARD' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts).toHaveLength(1)
      expect(result.value.accounts[0].account.name).toBe('Cartão')
    }
  })

  it('deve listar apenas as contas não arquivadas quando o filtro de arquivamento for falso (RN025)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira' }))
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Conta antiga', archivedAt: new Date() }))

    const result = await sut.execute({ ownerId: ownerId.toString(), archived: false })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts).toHaveLength(1)
      expect(result.value.accounts[0].account.name).toBe('Carteira')
    }
  })

  it('deve listar apenas as contas arquivadas quando o filtro de arquivamento for verdadeiro (RN024)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira' }))
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Conta antiga', archivedAt: new Date() }))

    const result = await sut.execute({ ownerId: ownerId.toString(), archived: true })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts).toHaveLength(1)
      expect(result.value.accounts[0].account.name).toBe('Conta antiga')
    }
  })

  it('deve listar as contas arquivadas e não arquivadas quando o filtro de arquivamento não for informado (RN024)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira' }))
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Conta antiga', archivedAt: new Date() }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts).toHaveLength(2)
    }
  })

  it('deve listar as contas em ordem alfabética de nome', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)

    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Poupança' }))
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira' }))
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Investimentos' }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts.map(({ account }) => account.name)).toEqual(['Carteira', 'Investimentos', 'Poupança'])
    }
  })

  it('deve devolver uma lista vazia quando o usuário não possui contas', async () => {
    await accountsRepository.create(makeAccount())

    const result = await sut.execute({ ownerId: new UniqueEntityID().toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts).toEqual([])
    }
  })
})
