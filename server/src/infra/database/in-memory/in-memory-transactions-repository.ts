import { Injectable } from '@nestjs/common'

import { TransactionsRepository } from '@domain/transaction/application/repositories/transactions-repository'
import { Transaction } from '@domain/transaction/enterprise/entities/transaction'

@Injectable()
export class InMemoryTransactionsRepository extends TransactionsRepository {
  readonly items: Transaction[] = []

  create(transaction: Transaction): Promise<void> {
    this.items.push(transaction)

    return Promise.resolve()
  }

  save(transaction: Transaction): Promise<void> {
    const index = this.items.findIndex(item => item.id.equals(transaction.id))

    if (index >= 0) {
      this.items[index] = transaction
    }

    return Promise.resolve()
  }

  findById(id: string): Promise<Transaction | null> {
    const transaction = this.items.find(item => item.id.toString() === id)

    return Promise.resolve(transaction ?? null)
  }
}
