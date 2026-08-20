import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Money } from '@core/value-objects/money'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'
import { ListAccountsUseCase } from '@domain/account/application/use-cases/list-accounts'
import { CreditCardSettings } from '@domain/account/enterprise/value-objects/credit-card-settings'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { makeAccount } from '@tests/factories/make-account'
import { makeAccountGroup } from '@tests/factories/make-account-group'
import { makeTransaction } from '@tests/factories/make-transaction'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let transactionsRepository: InMemoryTransactionsRepository
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
    transactionsRepository = new InMemoryTransactionsRepository()
    accountsRepository = new InMemoryAccountsRepository(accountGroupsRepository, transactionsRepository)
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

  it('deve somar as transações efetivadas ao saldo inicial (RN021, RN050)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id, initialBalance: Money.fromCents(10000) })

    await accountsRepository.create(account)
    await transactionsRepository.create(makeTransaction({ ownerId, accountId: account.id, type: 'INCOME', status: 'SETTLED', amount: Money.fromCents(5000) }))
    await transactionsRepository.create(makeTransaction({ ownerId, accountId: account.id, type: 'EXPENSE', status: 'SETTLED', amount: Money.fromCents(2000) }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts[0].balance?.amountInCents).toBe(13000)
    }
  })

  it('não deve considerar transações previstas no saldo (RN050)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id, initialBalance: Money.fromCents(10000) })

    await accountsRepository.create(account)
    await transactionsRepository.create(makeTransaction({ ownerId, accountId: account.id, type: 'INCOME', status: 'PLANNED', amount: Money.fromCents(5000) }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accounts[0].balance?.amountInCents).toBe(10000)
    }
  })

  it('deve debitar a conta de origem e creditar a conta de destino de uma transferência efetivada (RN021, RN044)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)
    const source = makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira', initialBalance: Money.fromCents(10000) })
    const destination = makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Poupança', initialBalance: Money.fromCents(2000) })

    await accountsRepository.create(source)
    await accountsRepository.create(destination)
    await transactionsRepository.create(
      makeTransaction({
        ownerId,
        accountId: null,
        categoryId: null,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        type: 'TRANSFER',
        status: 'SETTLED',
        amount: Money.fromCents(3000),
      }),
    )

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const sourceListed = result.value.accounts.find(({ account }) => account.id.equals(source.id))
      const destinationListed = result.value.accounts.find(({ account }) => account.id.equals(destination.id))

      expect(sourceListed?.balance?.amountInCents).toBe(7000)
      expect(destinationListed?.balance?.amountInCents).toBe(5000)
    }
  })

  it('não deve considerar transferência prevista no saldo (RN050)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)
    const source = makeAccount({ ownerId, accountGroupId: accountGroup.id, initialBalance: Money.fromCents(10000) })
    const destination = makeAccount({ ownerId, accountGroupId: accountGroup.id, initialBalance: Money.fromCents(2000) })

    await accountsRepository.create(source)
    await accountsRepository.create(destination)
    await transactionsRepository.create(
      makeTransaction({
        ownerId,
        accountId: null,
        categoryId: null,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        type: 'TRANSFER',
        status: 'PLANNED',
        amount: Money.fromCents(3000),
      }),
    )

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const sourceListed = result.value.accounts.find(({ account }) => account.id.equals(source.id))
      const destinationListed = result.value.accounts.find(({ account }) => account.id.equals(destination.id))

      expect(sourceListed?.balance?.amountInCents).toBe(10000)
      expect(destinationListed?.balance?.amountInCents).toBe(2000)
    }
  })

  it('não deve considerar transações efetivadas de outra conta no saldo', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = await createAccountGroup(ownerId)
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id, initialBalance: Money.fromCents(10000) })
    const anotherAccount = makeAccount({ ownerId, accountGroupId: accountGroup.id })

    await accountsRepository.create(account)
    await accountsRepository.create(anotherAccount)
    await transactionsRepository.create(makeTransaction({ ownerId, accountId: anotherAccount.id, type: 'INCOME', status: 'SETTLED', amount: Money.fromCents(5000) }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const listedAccount = result.value.accounts.find(({ account: found }) => found.id.equals(account.id))

      expect(listedAccount?.balance?.amountInCents).toBe(10000)
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
