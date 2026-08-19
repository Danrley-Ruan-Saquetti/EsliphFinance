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
}
