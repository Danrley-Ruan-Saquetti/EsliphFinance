import { Either, left, right } from '@core/either'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { AccountGroupWithAccountsCount, AccountGroupsRepository } from '@domain/account-group/application/repositories/account-groups-repository'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'

export interface GetAccountGroupRequest {
  accountGroupId: string
  ownerId: string
}

export type GetAccountGroupResponse = Either<ResourceNotFoundError, AccountGroupWithAccountsCount>

export class GetAccountGroupUseCase implements UseCase<GetAccountGroupRequest, GetAccountGroupResponse> {
  constructor(private readonly accountGroupsRepository: AccountGroupsRepository) {}

  async execute({ accountGroupId, ownerId }: GetAccountGroupRequest): Promise<GetAccountGroupResponse> {
    const found = await this.accountGroupsRepository.findById(accountGroupId)

    if (!found || !this.isOwnedBy(found.accountGroup, ownerId)) {
      return left(new ResourceNotFoundError('Grupo de contas não encontrado'))
    }

    return right(found)
  }

  private isOwnedBy(accountGroup: AccountGroup, ownerId: string): boolean {
    return accountGroup.ownerId.toString() === ownerId
  }
}
