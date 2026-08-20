import { Transaction } from '@domain/transaction/enterprise/entities/transaction'
import { MoneyPresenter } from '@infra/http/presenters/money-presenter'

export class TransactionPresenter {
  static toHTTP(transaction: Transaction) {
    return {
      id: transaction.id.toString(),
      accountId: transaction.accountId?.toString() ?? null,
      categoryId: transaction.categoryId?.toString() ?? null,
      sourceAccountId: transaction.sourceAccountId?.toString() ?? null,
      destinationAccountId: transaction.destinationAccountId?.toString() ?? null,
      type: transaction.type,
      status: transaction.status,
      date: transaction.date,
      amount: MoneyPresenter.toHTTP(transaction.amount),
      description: transaction.description,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt ?? null,
    }
  }
}
