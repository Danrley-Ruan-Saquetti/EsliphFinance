import { Injectable } from '@nestjs/common'

import { Money } from '@core/value-objects/money'
import { AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'
import { AccountWithBalance, AccountsRepository, FindManyAccountsFilters } from '@domain/account/application/repositories/accounts-repository'
import { Account } from '@domain/account/enterprise/entities/account'
import { Transaction } from '@domain/transaction/enterprise/entities/transaction'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'

@Injectable()
export class InMemoryAccountsRepository extends AccountsRepository {
  readonly items: Account[] = []

  constructor(
    private readonly accountGroupsRepository: InMemoryAccountGroupsRepository,
    private readonly transactionsRepository: InMemoryTransactionsRepository,
  ) {
    super()
  }

  create(account: Account): Promise<void> {
    this.items.push(account)

    return Promise.resolve()
  }

  save(account: Account): Promise<void> {
    const index = this.items.findIndex(item => item.id.equals(account.id))

    if (index >= 0) {
      this.items[index] = account
    }

    return Promise.resolve()
  }

  delete(id: string): Promise<void> {
    const index = this.items.findIndex(item => item.id.toString() === id)

    if (index >= 0) {
      this.items.splice(index, 1)
    }

    return Promise.resolve()
  }

  findById(id: string): Promise<Account | null> {
    const account = this.items.find(item => item.id.toString() === id)

    return Promise.resolve(account ?? null)
  }

  findManyByOwnerId(ownerId: string, filters: FindManyAccountsFilters = {}): Promise<AccountWithBalance[]> {
    const accounts = this.items
      .filter(item => item.ownerId.toString() === ownerId)
      .filter(item => !filters.accountGroupId || item.accountGroupId.toString() === filters.accountGroupId)
      .filter(item => !filters.accountGroupType || this.isFromGroupType(item, filters.accountGroupType))
      .filter(item => filters.archived === undefined || item.isArchived === filters.archived)
      .sort((first, second) => first.name.localeCompare(second.name))

    return Promise.resolve(accounts.map(account => ({ account, balance: this.calculateBalance(account) })))
  }

  private isFromGroupType(account: Account, accountGroupType: AccountGroupType): boolean {
    const accountGroup = this.accountGroupsRepository.items.find(item => item.id.toString() === account.accountGroupId.toString())

    return accountGroup?.type === accountGroupType
  }

  private calculateBalance(account: Account): Money {
    const settledAmountInCents = this.transactionsRepository.items
      .filter(transaction => transaction.accountId.equals(account.id) && transaction.status === Transaction.SETTLED_STATUS)
      .reduce((total, transaction) => total + this.signedAmountInCents(transaction), 0)

    return account.initialBalance.add(Money.fromCents(settledAmountInCents))
  }

  private signedAmountInCents(transaction: Transaction): number {
    if (transaction.type === Transaction.INCOME_TYPE) {
      return transaction.amount.amountInCents
    }
    if (transaction.type === Transaction.EXPENSE_TYPE) {
      return -transaction.amount.amountInCents
    }

    return 0
  }
}
