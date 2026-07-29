import { BaseError } from '@core/errors/base-error'

export class InvalidCredentialsError extends BaseError {
  readonly code = 'INVALID_CREDENTIALS'

  constructor(message = 'E-mail ou senha inválidos') {
    super(message)
  }
}
