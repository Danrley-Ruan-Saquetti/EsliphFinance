import { Either, right } from '@core/either'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { UseCase } from '@core/use-case'
import { AccountGroupsRepository } from '@domain/account-group/application/repositories/account-groups-repository'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'

export interface CreateAccountGroupRequest {
  ownerId: string
  name: string
  type?: AccountGroupType
}

export type CreateAccountGroupResponse = Either<never, { accountGroup: AccountGroup }>

export class CreateAccountGroupUseCase implements UseCase<CreateAccountGroupRequest, CreateAccountGroupResponse> {
  constructor(private readonly accountGroupsRepository: AccountGroupsRepository) {}

  async execute({ ownerId, name, type }: CreateAccountGroupRequest): Promise<CreateAccountGroupResponse> {
    const accountGroup = AccountGroup.create({ ownerId: new UniqueEntityID(ownerId), name, type })

    await this.accountGroupsRepository.create(accountGroup)

    return right({ accountGroup })
  }
}
