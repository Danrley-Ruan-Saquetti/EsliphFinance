import { Injectable } from '@nestjs/common'
import { and, asc, eq } from 'drizzle-orm'

import {
  AccountGroupWithAccountsCount,
  AccountGroupsRepository,
  FindManyAccountGroupsFilters,
} from '@domain/account-group/application/repositories/account-groups-repository'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { AccountGroupRecord, DrizzleAccountGroupMapper } from '@infra/database/drizzle/mappers/drizzle-account-group-mapper'
import { accountGroups } from '@infra/database/drizzle/schemas/account-groups'

@Injectable()
export class DrizzleAccountGroupsRepository extends AccountGroupsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super()
  }

  async create(accountGroup: AccountGroup): Promise<void> {
    await this.drizzle.db.insert(accountGroups).values(DrizzleAccountGroupMapper.toPersistence(accountGroup))
  }

  async findById(id: string): Promise<AccountGroupWithAccountsCount | null> {
    const [record] = await this.drizzle.db.select().from(accountGroups).where(eq(accountGroups.id, id)).limit(1)

    if (!record) {
      return null
    }

    return this.withAccountsCount(record)
  }

  async findManyByOwnerId(ownerId: string, filters: FindManyAccountGroupsFilters = {}): Promise<AccountGroupWithAccountsCount[]> {
    const conditions = [eq(accountGroups.ownerId, ownerId)]

    if (filters.type) {
      conditions.push(eq(accountGroups.type, filters.type))
    }

    const records = await this.drizzle.db
      .select()
      .from(accountGroups)
      .where(and(...conditions))
      .orderBy(asc(accountGroups.name))

    return records.map(record => this.withAccountsCount(record))
  }

  private withAccountsCount(record: AccountGroupRecord): AccountGroupWithAccountsCount {
    return { accountGroup: DrizzleAccountGroupMapper.toDomain(record), accountsCount: 0 }
  }
}
