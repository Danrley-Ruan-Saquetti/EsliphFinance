import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import { AccountsRepository } from '@domain/account/application/repositories/accounts-repository'
import { Account } from '@domain/account/enterprise/entities/account'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { DrizzleAccountMapper } from '@infra/database/drizzle/mappers/drizzle-account-mapper'
import { accounts } from '@infra/database/drizzle/schemas/accounts'

@Injectable()
export class DrizzleAccountsRepository extends AccountsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super()
  }

  async create(account: Account): Promise<void> {
    await this.drizzle.db.insert(accounts).values(DrizzleAccountMapper.toPersistence(account))
  }

  async findById(id: string): Promise<Account | null> {
    const [record] = await this.drizzle.db.select().from(accounts).where(eq(accounts.id, id)).limit(1)

    if (!record) {
      return null
    }

    return DrizzleAccountMapper.toDomain(record)
  }
}
