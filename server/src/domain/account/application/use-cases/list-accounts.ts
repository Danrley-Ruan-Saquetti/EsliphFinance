import { Either, right } from '@core/either'
import { UseCase } from '@core/use-case'
import { Money } from '@core/value-objects/money'
import { AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'
import { AccountWithBalance, AccountsRepository } from '@domain/account/application/repositories/accounts-repository'
import { Account } from '@domain/account/enterprise/entities/account'

export interface ListedAccount {
  account: Account
  balance: Money | null
  availableLimit: Money | null
}

export interface ListAccountsRequest {
  ownerId: string
  accountGroupId?: string
  accountGroupType?: AccountGroupType
  archived?: boolean
}

export type ListAccountsResponse = Either<never, { accounts: ListedAccount[] }>

export class ListAccountsUseCase implements UseCase<ListAccountsRequest, ListAccountsResponse> {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  async execute({ ownerId, accountGroupId, accountGroupType, archived }: ListAccountsRequest): Promise<ListAccountsResponse> {
    const accounts = await this.accountsRepository.findManyByOwnerId(ownerId, { accountGroupId, accountGroupType, archived })

    return right({ accounts: accounts.map(accountWithBalance => this.toListedAccount(accountWithBalance)) })
  }

  private toListedAccount({ account, balance }: AccountWithBalance): ListedAccount {
    if (account.creditCard) {
      return { account, balance: null, availableLimit: account.creditCard.limit }
    }

    return { account, balance, availableLimit: null }
  }
}
