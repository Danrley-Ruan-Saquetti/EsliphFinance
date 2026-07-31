import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ListAccountGroupsUseCase } from '@domain/account-group/application/use-cases/list-account-groups'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: ListAccountGroupsUseCase

describe('Listar grupos de contas', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    sut = new ListAccountGroupsUseCase(accountGroupsRepository)
  })

  it('deve listar apenas os grupos de contas do usuário informado (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID()

    await accountGroupsRepository.create(makeAccountGroup({ ownerId, name: 'Contas' }))
    await accountGroupsRepository.create(makeAccountGroup({ name: 'Contas de outro usuário' }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accountGroups).toHaveLength(1)
      expect(result.value.accountGroups[0].accountGroup.name).toBe('Contas')
    }
  })

  it('deve listar os grupos de contas do tipo informado quando o filtro por tipo for usado (RN015)', async () => {
    const ownerId = new UniqueEntityID()

    await accountGroupsRepository.create(makeAccountGroup({ ownerId, name: 'Contas', type: 'DEFAULT' }))
    await accountGroupsRepository.create(makeAccountGroup({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' }))

    const result = await sut.execute({ ownerId: ownerId.toString(), type: 'CREDIT_CARD' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accountGroups).toHaveLength(1)
      expect(result.value.accountGroups[0].accountGroup.type).toBe('CREDIT_CARD')
    }
  })

  it('deve listar os grupos de contas de todos os tipos quando o filtro por tipo não for informado (RN015)', async () => {
    const ownerId = new UniqueEntityID()

    await accountGroupsRepository.create(makeAccountGroup({ ownerId, name: 'Contas', type: 'DEFAULT' }))
    await accountGroupsRepository.create(makeAccountGroup({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accountGroups).toHaveLength(2)
    }
  })

  it('deve informar a quantidade de contas vinculadas a cada grupo de contas', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroupWithAccounts = makeAccountGroup({ ownerId, name: 'Contas' })
    const accountGroupWithoutAccounts = makeAccountGroup({ ownerId, name: 'Investimentos' })

    await accountGroupsRepository.create(accountGroupWithAccounts)
    await accountGroupsRepository.create(accountGroupWithoutAccounts)
    accountGroupsRepository.accountsCountByAccountGroupId.set(accountGroupWithAccounts.id.toString(), 3)

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accountGroups[0].accountsCount).toBe(3)
      expect(result.value.accountGroups[1].accountsCount).toBe(0)
    }
  })

  it('deve listar os grupos de contas em ordem alfabética de nome', async () => {
    const ownerId = new UniqueEntityID()

    await accountGroupsRepository.create(makeAccountGroup({ ownerId, name: 'Investimentos' }))
    await accountGroupsRepository.create(makeAccountGroup({ ownerId, name: 'Cartões' }))
    await accountGroupsRepository.create(makeAccountGroup({ ownerId, name: 'Contas' }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accountGroups.map(({ accountGroup }) => accountGroup.name)).toEqual(['Cartões', 'Contas', 'Investimentos'])
    }
  })

  it('deve devolver uma lista vazia quando o usuário não possui grupos de contas', async () => {
    await accountGroupsRepository.create(makeAccountGroup())

    const result = await sut.execute({ ownerId: new UniqueEntityID().toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accountGroups).toEqual([])
    }
  })
})
