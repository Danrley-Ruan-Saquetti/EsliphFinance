import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

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

  async save(transaction: Transaction): Promise<void> {
    await this.drizzle.db.update(transactions).set(DrizzleTransactionMapper.toPersistence(transaction)).where(eq(transactions.id, transaction.id.toString()))
  }

  async findById(id: string): Promise<Transaction | null> {
    const [record] = await this.drizzle.db.select().from(transactions).where(eq(transactions.id, id)).limit(1)

    if (!record) {
      return null
    }

    return DrizzleTransactionMapper.toDomain(record)
  }
}
