import { Either, left, right } from '@core/either'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { AccountGroupsRepository } from '@domain/account-group/application/repositories/account-groups-repository'
import { AccountGroupHasLinkedAccountsError } from '@domain/account-group/application/use-cases/errors/account-group-has-linked-accounts-error'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'

export interface DeleteAccountGroupRequest {
  accountGroupId: string
  ownerId: string
}

export type DeleteAccountGroupResponse = Either<ResourceNotFoundError | AccountGroupHasLinkedAccountsError, null>

export class DeleteAccountGroupUseCase implements UseCase<DeleteAccountGroupRequest, DeleteAccountGroupResponse> {
  constructor(private readonly accountGroupsRepository: AccountGroupsRepository) {}

  async execute({ accountGroupId, ownerId }: DeleteAccountGroupRequest): Promise<DeleteAccountGroupResponse> {
    const found = await this.accountGroupsRepository.findById(accountGroupId)

    if (!found || !this.isOwnedBy(found.accountGroup, ownerId)) {
      return left(new ResourceNotFoundError('Grupo de contas não encontrado'))
    }

    if (found.accountsCount > 0) {
      return left(new AccountGroupHasLinkedAccountsError(found.accountsCount))
    }

    await this.accountGroupsRepository.delete(accountGroupId)

    return right(null)
  }

  private isOwnedBy(accountGroup: AccountGroup, ownerId: string): boolean {
    return accountGroup.ownerId.toString() === ownerId
  }
}
