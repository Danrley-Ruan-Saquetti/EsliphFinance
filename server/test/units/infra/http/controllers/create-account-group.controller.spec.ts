import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { CreateAccountGroupUseCase } from '@domain/account-group/application/use-cases/create-account-group'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { CreateAccountGroupController } from '@infra/http/controllers/create-account-group.controller'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: CreateAccountGroupController

describe('CreateAccountGroupController', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    sut = new CreateAccountGroupController(new CreateAccountGroupUseCase(accountGroupsRepository))
  })

  it('deve devolver o grupo de contas criado, sem nenhuma conta vinculada, no formato de resposta', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    const response = await sut.handle(currentUser, { name: 'Cartões', type: 'CREDIT_CARD' })

    expect(response.accountGroup).toEqual({
      id: accountGroupsRepository.items[0].id.toString(),
      name: 'Cartões',
      type: 'CREDIT_CARD',
      accountsCount: 0,
      createdAt: accountGroupsRepository.items[0].createdAt,
      updatedAt: null,
    })
  })

  it('deve criar o grupo de contas com o tipo "Padrão" quando o tipo não for informado (RN016)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    const response = await sut.handle(currentUser, { name: 'Contas' })

    expect(response.accountGroup.type).toBe('DEFAULT')
  })

  it('deve persistir o grupo de contas vinculado ao usuário autenticado (RN010)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    await sut.handle(currentUser, { name: 'Contas' })

    expect(accountGroupsRepository.items).toHaveLength(1)
    expect(accountGroupsRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })

  it('deve ignorar o dono informado no corpo e vincular o grupo de contas ao usuário do token (RN010, RN011)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const forgedBody = Object.assign({ name: 'Contas' }, { ownerId: new UniqueEntityID().toString() })

    await sut.handle(currentUser, forgedBody)

    expect(accountGroupsRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })
})
