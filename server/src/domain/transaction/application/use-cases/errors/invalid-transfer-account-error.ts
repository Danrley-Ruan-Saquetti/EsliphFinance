import { BaseError } from '@core/errors/base-error'

export class InvalidTransferAccountError extends BaseError {
  readonly code = 'INVALID_TRANSFER_ACCOUNT'

  constructor(message = 'A conta informada não pode ser usada em uma transferência') {
    super(message)
  }
}
