import { Either, left, right } from '@core/either'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { TransactionsRepository } from '@domain/transaction/application/repositories/transactions-repository'
import { TransactionStatusConflictError } from '@domain/transaction/application/use-cases/errors/transaction-status-conflict-error'
import { Transaction } from '@domain/transaction/enterprise/entities/transaction'

export interface RevertTransactionRequest {
  ownerId: string
  transactionId: string
}

export type RevertTransactionResponse = Either<ResourceNotFoundError | TransactionStatusConflictError, { transaction: Transaction }>

export class RevertTransactionUseCase implements UseCase<RevertTransactionRequest, RevertTransactionResponse> {
  constructor(private readonly transactionsRepository: TransactionsRepository) {}

  async execute({ ownerId, transactionId }: RevertTransactionRequest): Promise<RevertTransactionResponse> {
    const transaction = await this.transactionsRepository.findById(transactionId)

    if (!transaction || transaction.ownerId.toString() !== ownerId) {
      return left(new ResourceNotFoundError('Transação não encontrada'))
    }
    if (transaction.status === Transaction.PLANNED_STATUS) {
      return left(new TransactionStatusConflictError('A transação já está prevista'))
    }

    transaction.revert()

    await this.transactionsRepository.save(transaction)

    return right({ transaction })
  }
}
