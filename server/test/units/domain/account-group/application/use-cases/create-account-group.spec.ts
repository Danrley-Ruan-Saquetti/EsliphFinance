import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { CreateAccountGroupUseCase } from '@domain/account-group/application/use-cases/create-account-group'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: CreateAccountGroupUseCase

describe('Criar grupo de contas', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    sut = new CreateAccountGroupUseCase(accountGroupsRepository)
  })

  it('deve criar o grupo de contas e persisti-lo no repositório (RN016)', async () => {
    const ownerId = new UniqueEntityID().toString()

    const result = await sut.execute({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' })

    expect(result.isRight()).toBe(true)
    expect(accountGroupsRepository.items).toHaveLength(1)
    expect(accountGroupsRepository.items[0].name).toBe('Cartões')
    expect(accountGroupsRepository.items[0].type).toBe('CREDIT_CARD')
  })

  it('deve criar o grupo de contas com o tipo "Padrão" quando o tipo não for informado (RN016)', async () => {
    const result = await sut.execute({ ownerId: new UniqueEntityID().toString(), name: 'Contas' })

    expect(result.isRight()).toBe(true)
    expect(accountGroupsRepository.items[0].type).toBe('DEFAULT')
  })

  it('deve vincular o grupo de contas ao usuário informado (RN010)', async () => {
    const ownerId = new UniqueEntityID().toString()

    await sut.execute({ ownerId, name: 'Contas' })

    expect(accountGroupsRepository.items[0].ownerId.toString()).toBe(ownerId)
  })

  it('deve lançar InvariantError quando o nome for vazio (RN016)', async () => {
    await expect(sut.execute({ ownerId: new UniqueEntityID().toString(), name: '   ' })).rejects.toThrow(InvariantError)

    expect(accountGroupsRepository.items).toHaveLength(0)
  })
})
