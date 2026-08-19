import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { Money } from '@core/value-objects/money'
import { UpdateAccountUseCase } from '@domain/account/application/use-cases/update-account'
import { InvalidAccountGroupTypeError } from '@domain/account/application/use-cases/errors/invalid-account-group-type-error'
import { CreditCardSettings } from '@domain/account/enterprise/value-objects/credit-card-settings'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { makeAccount } from '@tests/factories/make-account'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountsRepository: InMemoryAccountsRepository
let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: UpdateAccountUseCase

describe('Editar conta', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    accountsRepository = new InMemoryAccountsRepository(accountGroupsRepository, new InMemoryTransactionsRepository())
    sut = new UpdateAccountUseCase(accountsRepository, accountGroupsRepository)
  })

  it('deve alterar o nome, o ícone, a cor e o saldo inicial de uma conta do tipo "Padrão" (RN018)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, type: 'DEFAULT' })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira', initialBalance: Money.fromCents(10000), icon: 'wallet', color: '#1E88E5' })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    const result = await sut.execute({
      accountId: account.id.toString(),
      ownerId: ownerId.toString(),
      accountGroupId: accountGroup.id.toString(),
      name: 'Conta corrente',
      initialBalance: Money.fromCents(50000),
      icon: 'bank',
      color: '#43A047',
    })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items[0].name).toBe('Conta corrente')
    expect(accountsRepository.items[0].icon).toBe('bank')
    expect(accountsRepository.items[0].color).toBe('#43A047')
    expect(accountsRepository.items[0].initialBalance.amountInCents).toBe(50000)
  })

  it('deve refletir o saldo inicial alterado na listagem da conta (RN018, RN021)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, type: 'DEFAULT' })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id, initialBalance: Money.fromCents(10000) })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    await sut.execute({
      accountId: account.id.toString(),
      ownerId: ownerId.toString(),
      accountGroupId: accountGroup.id.toString(),
      name: account.name,
      initialBalance: Money.fromCents(90000),
      color: account.color,
    })

    const [listed] = await accountsRepository.findManyByOwnerId(ownerId.toString())

    expect(listed.balance.amountInCents).toBe(90000)
  })

  it('deve manter o saldo inicial quando ele não for informado (RN018)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, type: 'DEFAULT' })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id, initialBalance: Money.fromCents(10000) })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    await sut.execute({
      accountId: account.id.toString(),
      ownerId: ownerId.toString(),
      accountGroupId: accountGroup.id.toString(),
      name: 'Novo nome',
      color: account.color,
    })

    expect(accountsRepository.items[0].initialBalance.amountInCents).toBe(10000)
  })

  it('deve alterar o nome, o ícone, a cor, o limite, o dia de fechamento e o dia de vencimento de uma conta de cartão de crédito (RN019)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, type: 'CREDIT_CARD' })
    const account = makeAccount({
      ownerId,
      accountGroupId: accountGroup.id,
      name: 'Cartão',
      creditCard: CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 }),
    })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    const result = await sut.execute({
      accountId: account.id.toString(),
      ownerId: ownerId.toString(),
      accountGroupId: accountGroup.id.toString(),
      name: 'Cartão Platinum',
      icon: 'credit-card',
      color: '#8E24AA',
      creditCard: { limit: Money.fromCents(900000), closingDay: 10, dueDay: 17 },
    })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items[0].name).toBe('Cartão Platinum')
    expect(accountsRepository.items[0].creditCard?.limit.amountInCents).toBe(900000)
    expect(accountsRepository.items[0].creditCard?.closingDay.day).toBe(10)
    expect(accountsRepository.items[0].creditCard?.dueDay.day).toBe(17)
  })

  it('deve permitir a troca de grupo entre grupos do mesmo tipo (RN018)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, type: 'DEFAULT' })
    const otherAccountGroup = makeAccountGroup({ ownerId, type: 'DEFAULT' })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountGroupsRepository.create(otherAccountGroup)
    await accountsRepository.create(account)

    const result = await sut.execute({
      accountId: account.id.toString(),
      ownerId: ownerId.toString(),
      accountGroupId: otherAccountGroup.id.toString(),
      name: account.name,
      color: account.color,
    })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items[0].accountGroupId.toString()).toBe(otherAccountGroup.id.toString())
  })

  it('deve rejeitar a troca de grupo para um grupo de tipo diferente (RN018, RN019)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, type: 'DEFAULT' })
    const creditCardAccountGroup = makeAccountGroup({ ownerId, type: 'CREDIT_CARD' })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountGroupsRepository.create(creditCardAccountGroup)
    await accountsRepository.create(account)

    const result = await sut.execute({
      accountId: account.id.toString(),
      ownerId: ownerId.toString(),
      accountGroupId: creditCardAccountGroup.id.toString(),
      name: account.name,
      color: account.color,
      creditCard: { limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidAccountGroupTypeError)
    expect(accountsRepository.items[0].accountGroupId.toString()).toBe(accountGroup.id.toString())
  })

  it('deve retornar ResourceNotFoundError quando a conta não existir (RN010, RN011)', async () => {
    const result = await sut.execute({
      accountId: new UniqueEntityID().toString(),
      ownerId: new UniqueEntityID().toString(),
      accountGroupId: new UniqueEntityID().toString(),
      name: 'Carteira',
      color: '#1E88E5',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve retornar ResourceNotFoundError quando a conta for de outro usuário (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    const result = await sut.execute({
      accountId: account.id.toString(),
      ownerId: new UniqueEntityID().toString(),
      accountGroupId: accountGroup.id.toString(),
      name: 'Carteira invadida',
      color: '#1E88E5',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    expect(accountsRepository.items[0].name).not.toBe('Carteira invadida')
  })

  it('deve retornar ResourceNotFoundError quando o novo grupo de contas for de outro usuário (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id })
    const otherUserAccountGroup = makeAccountGroup({ ownerId: new UniqueEntityID() })

    await accountGroupsRepository.create(accountGroup)
    await accountGroupsRepository.create(otherUserAccountGroup)
    await accountsRepository.create(account)

    const result = await sut.execute({
      accountId: account.id.toString(),
      ownerId: ownerId.toString(),
      accountGroupId: otherUserAccountGroup.id.toString(),
      name: account.name,
      color: account.color,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve retornar InvalidAccountGroupTypeError quando o grupo de destino for "Cartão de Crédito" e os dados do cartão não forem informados (RN019)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, type: 'CREDIT_CARD' })
    const account = makeAccount({
      ownerId,
      accountGroupId: accountGroup.id,
      creditCard: CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 }),
    })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    const result = await sut.execute({
      accountId: account.id.toString(),
      ownerId: ownerId.toString(),
      accountGroupId: accountGroup.id.toString(),
      name: account.name,
      color: account.color,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidAccountGroupTypeError)
  })

  it('deve retornar InvalidAccountGroupTypeError quando o grupo de destino for "Padrão" e os dados do cartão forem informados (RN019)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, type: 'DEFAULT' })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    const result = await sut.execute({
      accountId: account.id.toString(),
      ownerId: ownerId.toString(),
      accountGroupId: accountGroup.id.toString(),
      name: account.name,
      color: account.color,
      creditCard: { limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidAccountGroupTypeError)
  })

  it('deve retornar ResourceNotFoundError quando o grupo atual da conta não existir mais', async () => {
    const ownerId = new UniqueEntityID()
    const orphanedAccountGroupId = new UniqueEntityID()
    const account = makeAccount({ ownerId, accountGroupId: orphanedAccountGroupId })

    await accountsRepository.create(account)

    const result = await sut.execute({
      accountId: account.id.toString(),
      ownerId: ownerId.toString(),
      accountGroupId: orphanedAccountGroupId.toString(),
      name: account.name,
      color: account.color,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve lançar InvariantError quando o nome informado for vazio (RN018)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    await expect(
      sut.execute({
        accountId: account.id.toString(),
        ownerId: ownerId.toString(),
        accountGroupId: accountGroup.id.toString(),
        name: '   ',
        color: account.color,
      }),
    ).rejects.toThrow(InvariantError)
  })
})
