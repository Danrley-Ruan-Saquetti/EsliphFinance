import { Injectable } from '@nestjs/common'

import { TransactionsRepository } from '@domain/transaction/application/repositories/transactions-repository'
import { Transaction } from '@domain/transaction/enterprise/entities/transaction'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { DrizzleTransactionMapper } from '@infra/database/drizzle/mappers/drizzle-transaction-mapper'
import { transactions } from '@infra/database/drizzle/schemas/transactions'

@Injectable()
export class DrizzleTransactionsRepository extends TransactionsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super()
  }

  async create(transaction: Transaction): Promise<void> {
    await this.drizzle.db.insert(transactions).values(DrizzleTransactionMapper.toPersistence(transaction))
  }
}
