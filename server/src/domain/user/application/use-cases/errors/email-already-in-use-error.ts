import { BaseError } from '@core/errors/base-error'

export class EmailAlreadyInUseError extends BaseError {
  readonly code = 'EMAIL_ALREADY_IN_USE'

  constructor(message = 'O e-mail informado já está em uso') {
    super(message)
  }
}
