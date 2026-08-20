import { Transaction } from '@domain/transaction/enterprise/entities/transaction'
import { TransactionStatus } from '@domain/transaction/enterprise/value-objects/transaction-status'
import { UsersRepository } from '@domain/user/application/repositories/users-repository'

export async function resolveDefaultTransactionStatus(usersRepository: UsersRepository, ownerId: string, date: Date): Promise<TransactionStatus> {
  const owner = await usersRepository.findById(ownerId)

  if (owner?.defaultTransactionStatus) {
    return owner.defaultTransactionStatus
  }

  return isFutureDate(date) ? Transaction.PLANNED_STATUS : Transaction.SETTLED_STATUS
}

function isFutureDate(date: Date): boolean {
  const today = new Date()
  const todayAtMidnightUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const dateAtMidnightUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())

  return dateAtMidnightUTC > todayAtMidnightUTC
}
