import { Injectable } from '@nestjs/common'
import { and, asc, count, eq } from 'drizzle-orm'

import {
  AccountGroupWithAccountsCount,
  AccountGroupsRepository,
  FindManyAccountGroupsFilters,
} from '@domain/account-group/application/repositories/account-groups-repository'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { AccountGroupRecord, DrizzleAccountGroupMapper } from '@infra/database/drizzle/mappers/drizzle-account-group-mapper'
import { accountGroups } from '@infra/database/drizzle/schemas/account-groups'
import { accounts } from '@infra/database/drizzle/schemas/accounts'

interface AccountGroupWithAccountsCountRecord {
  accountGroup: AccountGroupRecord
  accountsCount: number
}

@Injectable()
export class DrizzleAccountGroupsRepository extends AccountGroupsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super()
  }

  async create(accountGroup: AccountGroup): Promise<void> {
    await this.drizzle.db.insert(accountGroups).values(DrizzleAccountGroupMapper.toPersistence(accountGroup))
  }

  async findById(id: string): Promise<AccountGroupWithAccountsCount | null> {
    const [record] = await this.drizzle.db
      .select({ accountGroup: accountGroups, accountsCount: count(accounts.id) })
      .from(accountGroups)
      .leftJoin(accounts, eq(accounts.accountGroupId, accountGroups.id))
      .where(eq(accountGroups.id, id))
      .groupBy(accountGroups.id)
      .limit(1)

    if (!record) {
      return null
    }

    return this.toDomain(record)
  }

  async findManyByOwnerId(ownerId: string, filters: FindManyAccountGroupsFilters = {}): Promise<AccountGroupWithAccountsCount[]> {
    const conditions = [eq(accountGroups.ownerId, ownerId)]

    if (filters.type) {
      conditions.push(eq(accountGroups.type, filters.type))
    }

    const records = await this.drizzle.db
      .select({ accountGroup: accountGroups, accountsCount: count(accounts.id) })
      .from(accountGroups)
      .leftJoin(accounts, eq(accounts.accountGroupId, accountGroups.id))
      .where(and(...conditions))
      .groupBy(accountGroups.id)
      .orderBy(asc(accountGroups.name))

    return records.map(record => this.toDomain(record))
  }

  private toDomain({ accountGroup, accountsCount }: AccountGroupWithAccountsCountRecord): AccountGroupWithAccountsCount {
    return { accountGroup: DrizzleAccountGroupMapper.toDomain(accountGroup), accountsCount }
  }
}
