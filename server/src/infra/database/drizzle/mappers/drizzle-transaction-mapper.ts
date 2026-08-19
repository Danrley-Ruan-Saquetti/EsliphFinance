import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Money } from '@core/value-objects/money'
import { Transaction } from '@domain/transaction/enterprise/entities/transaction'
import { transactions } from '@infra/database/drizzle/schemas/transactions'

export type TransactionRecord = typeof transactions.$inferSelect
export type TransactionInsert = typeof transactions.$inferInsert

export class DrizzleTransactionMapper {
  static toDomain(record: TransactionRecord): Transaction {
    return Transaction.create(
      {
        ownerId: new UniqueEntityID(record.ownerId),
        accountId: new UniqueEntityID(record.accountId),
        categoryId: record.categoryId ? new UniqueEntityID(record.categoryId) : null,
        type: record.type,
        status: record.status,
        date: record.date,
        amount: Money.fromCents(record.amount),
        description: record.description,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      new UniqueEntityID(record.id),
    )
  }

  static toPersistence(transaction: Transaction): TransactionInsert {
    return {
      id: transaction.id.toString(),
      ownerId: transaction.ownerId.toString(),
      accountId: transaction.accountId.toString(),
      categoryId: transaction.categoryId?.toString() ?? null,
      type: transaction.type,
      status: transaction.status,
      date: transaction.date,
      amount: transaction.amount.amountInCents,
      description: transaction.description ?? null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt ?? null,
    }
  }
}
