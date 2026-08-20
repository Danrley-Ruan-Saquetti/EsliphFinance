import { Injectable } from '@nestjs/common'
import { and, asc, eq, isNotNull, isNull, or, sql } from 'drizzle-orm'

import { Money } from '@core/value-objects/money'
import { AccountWithBalance, AccountsRepository, FindManyAccountsFilters } from '@domain/account/application/repositories/accounts-repository'
import { Account } from '@domain/account/enterprise/entities/account'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { AccountRecord, DrizzleAccountMapper } from '@infra/database/drizzle/mappers/drizzle-account-mapper'
import { accountGroups } from '@infra/database/drizzle/schemas/account-groups'
import { accounts } from '@infra/database/drizzle/schemas/accounts'
import { transactions } from '@infra/database/drizzle/schemas/transactions'

interface AccountWithBalanceRecord {
  account: AccountRecord
  balanceInCents: string
}

const settledTransactionsBalance = sql<string>`coalesce(sum(case when ${transactions.status} = 'SETTLED' then
  case
    when ${transactions.type} = 'INCOME' and ${transactions.accountId} = ${accounts.id} then ${transactions.amount}
    when ${transactions.type} = 'EXPENSE' and ${transactions.accountId} = ${accounts.id} then -${transactions.amount}
    when ${transactions.type} = 'TRANSFER' and ${transactions.destinationAccountId} = ${accounts.id} then ${transactions.amount}
    when ${transactions.type} = 'TRANSFER' and ${transactions.sourceAccountId} = ${accounts.id} then -${transactions.amount}
    else 0
  end
else 0 end), 0)`

@Injectable()
export class DrizzleAccountsRepository extends AccountsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super()
  }

  async create(account: Account): Promise<void> {
    await this.drizzle.db.insert(accounts).values(DrizzleAccountMapper.toPersistence(account))
  }

  async save(account: Account): Promise<void> {
    await this.drizzle.db.update(accounts).set(DrizzleAccountMapper.toPersistence(account)).where(eq(accounts.id, account.id.toString()))
  }

  async delete(id: string): Promise<void> {
    await this.drizzle.db.delete(accounts).where(eq(accounts.id, id))
  }

  async findById(id: string): Promise<Account | null> {
    const [record] = await this.drizzle.db.select().from(accounts).where(eq(accounts.id, id)).limit(1)

    if (!record) {
      return null
    }

    return DrizzleAccountMapper.toDomain(record)
  }

  async findManyByOwnerId(ownerId: string, filters: FindManyAccountsFilters = {}): Promise<AccountWithBalance[]> {
    const conditions = [eq(accounts.ownerId, ownerId)]

    if (filters.accountGroupId) {
      conditions.push(eq(accounts.accountGroupId, filters.accountGroupId))
    }
    if (filters.accountGroupType) {
      conditions.push(eq(accountGroups.type, filters.accountGroupType))
    }
    if (filters.archived !== undefined) {
      conditions.push(filters.archived ? isNotNull(accounts.archivedAt) : isNull(accounts.archivedAt))
    }

    const records = await this.drizzle.db
      .select({ account: accounts, balanceInCents: sql<string>`${accounts.initialBalance} + ${settledTransactionsBalance}` })
      .from(accounts)
      .innerJoin(accountGroups, eq(accountGroups.id, accounts.accountGroupId))
      .leftJoin(
        transactions,
        or(eq(transactions.accountId, accounts.id), eq(transactions.sourceAccountId, accounts.id), eq(transactions.destinationAccountId, accounts.id)),
      )
      .where(and(...conditions))
      .groupBy(accounts.id)
      .orderBy(asc(accounts.name))

    return records.map(record => this.toDomain(record))
  }

  private toDomain({ account, balanceInCents }: AccountWithBalanceRecord): AccountWithBalance {
    return { account: DrizzleAccountMapper.toDomain(account), balance: Money.fromCents(Number(balanceInCents)) }
  }
}
