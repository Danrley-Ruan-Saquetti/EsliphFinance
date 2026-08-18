import { Either, left, right } from '@core/either'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { AccountGroupWithAccountsCount, AccountGroupsRepository } from '@domain/account-group/application/repositories/account-groups-repository'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'

export interface UpdateAccountGroupRequest {
  accountGroupId: string
  ownerId: string
  name: string
  type: AccountGroupType
}

export type UpdateAccountGroupResponse = Either<ResourceNotFoundError | NotAllowedError, AccountGroupWithAccountsCount>

export class UpdateAccountGroupUseCase implements UseCase<UpdateAccountGroupRequest, UpdateAccountGroupResponse> {
  constructor(private readonly accountGroupsRepository: AccountGroupsRepository) {}

  async execute({ accountGroupId, ownerId, name, type }: UpdateAccountGroupRequest): Promise<UpdateAccountGroupResponse> {
    const found = await this.accountGroupsRepository.findById(accountGroupId)

    if (!found || !this.isOwnedBy(found.accountGroup, ownerId)) {
      return left(new ResourceNotFoundError('Grupo de contas não encontrado'))
    }

    const { accountGroup, accountsCount } = found

    if (type !== accountGroup.type && accountsCount > 0) {
      return left(new NotAllowedError('Não é possível alterar o tipo do grupo de contas quando houver contas vinculadas'))
    }

    accountGroup.changeName(name)
    accountGroup.changeType(type)

    await this.accountGroupsRepository.save(accountGroup)

    return right({ accountGroup, accountsCount })
  }

  private isOwnedBy(accountGroup: AccountGroup, ownerId: string): boolean {
    return accountGroup.ownerId.toString() === ownerId
  }
}
