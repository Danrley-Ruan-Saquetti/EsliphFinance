import { Transaction } from '@domain/transaction/enterprise/entities/transaction'

export abstract class TransactionsRepository {
  abstract create(transaction: Transaction): Promise<void>
}
