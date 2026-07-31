import { Either, right } from '@core/either'
import { UseCase } from '@core/use-case'
import { AccountGroupWithAccountsCount, AccountGroupsRepository } from '@domain/account-group/application/repositories/account-groups-repository'
import { AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'

export interface ListAccountGroupsRequest {
  ownerId: string
  type?: AccountGroupType
}

export type ListAccountGroupsResponse = Either<never, { accountGroups: AccountGroupWithAccountsCount[] }>

export class ListAccountGroupsUseCase implements UseCase<ListAccountGroupsRequest, ListAccountGroupsResponse> {
  constructor(private readonly accountGroupsRepository: AccountGroupsRepository) {}

  async execute({ ownerId, type }: ListAccountGroupsRequest): Promise<ListAccountGroupsResponse> {
    const accountGroups = await this.accountGroupsRepository.findManyByOwnerId(ownerId, { type })

    return right({ accountGroups })
  }
}
