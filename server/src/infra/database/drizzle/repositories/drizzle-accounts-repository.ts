import { Injectable } from '@nestjs/common'
import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm'

import { Money } from '@core/value-objects/money'
import { AccountWithBalance, AccountsRepository, FindManyAccountsFilters } from '@domain/account/application/repositories/accounts-repository'
import { Account } from '@domain/account/enterprise/entities/account'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { AccountRecord, DrizzleAccountMapper } from '@infra/database/drizzle/mappers/drizzle-account-mapper'
import { accountGroups } from '@infra/database/drizzle/schemas/account-groups'
import { accounts } from '@infra/database/drizzle/schemas/accounts'

interface AccountWithBalanceRecord {
  account: AccountRecord
  balanceInCents: number
}

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
      .select({ account: accounts, balanceInCents: accounts.initialBalance })
      .from(accounts)
      .innerJoin(accountGroups, eq(accountGroups.id, accounts.accountGroupId))
      .where(and(...conditions))
      .orderBy(asc(accounts.name))

    return records.map(record => this.toDomain(record))
  }

  private toDomain({ account, balanceInCents }: AccountWithBalanceRecord): AccountWithBalance {
    return { account: DrizzleAccountMapper.toDomain(account), balance: Money.fromCents(balanceInCents) }
  }
}
