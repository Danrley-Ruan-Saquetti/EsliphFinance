import { BaseError } from '@core/errors/base-error'

export class InvalidAccountGroupTypeError extends BaseError {
  readonly code = 'INVALID_ACCOUNT_GROUP_TYPE'

  constructor(message = 'O grupo de contas informado não é do tipo esperado para a conta') {
    super(message)
  }
}
