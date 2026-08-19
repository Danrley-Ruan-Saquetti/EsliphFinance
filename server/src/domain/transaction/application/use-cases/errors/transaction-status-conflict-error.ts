import { BaseError } from '@core/errors/base-error'

export class TransactionStatusConflictError extends BaseError {
  readonly code = 'TRANSACTION_STATUS_CONFLICT'

  constructor(message = 'A situação da transação não permite esta operação') {
    super(message)
  }
}
