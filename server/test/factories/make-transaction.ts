import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Money } from '@core/value-objects/money'
import { Transaction, TransactionProps } from '@domain/transaction/enterprise/entities/transaction'

export function makeTransaction(override: Partial<TransactionProps> = {}, id?: UniqueEntityID): Transaction {
  return Transaction.create(
    {
      ownerId: new UniqueEntityID(),
      accountId: new UniqueEntityID(),
      categoryId: new UniqueEntityID(),
      sourceAccountId: null,
      destinationAccountId: null,
      type: 'EXPENSE',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(5000),
      description: null,
      ...override,
    },
    id,
  )
}
