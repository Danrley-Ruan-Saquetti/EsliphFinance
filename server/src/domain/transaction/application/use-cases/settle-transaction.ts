import { Either, left, right } from '@core/either'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { TransactionsRepository } from '@domain/transaction/application/repositories/transactions-repository'
import { TransactionStatusConflictError } from '@domain/transaction/application/use-cases/errors/transaction-status-conflict-error'
import { Transaction } from '@domain/transaction/enterprise/entities/transaction'

export interface SettleTransactionRequest {
  ownerId: string
  transactionId: string
  date?: Date
}

export type SettleTransactionResponse = Either<ResourceNotFoundError | TransactionStatusConflictError, { transaction: Transaction }>

export class SettleTransactionUseCase implements UseCase<SettleTransactionRequest, SettleTransactionResponse> {
  constructor(private readonly transactionsRepository: TransactionsRepository) {}

  async execute({ ownerId, transactionId, date }: SettleTransactionRequest): Promise<SettleTransactionResponse> {
    const transaction = await this.transactionsRepository.findById(transactionId)

    if (!transaction || transaction.ownerId.toString() !== ownerId) {
      return left(new ResourceNotFoundError('Transação não encontrada'))
    }
    if (transaction.status === Transaction.SETTLED_STATUS) {
      return left(new TransactionStatusConflictError('A transação já está efetivada'))
    }

    transaction.settle(date)

    await this.transactionsRepository.save(transaction)

    return right({ transaction })
  }
}
