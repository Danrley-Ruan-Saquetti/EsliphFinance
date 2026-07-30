import { BaseError } from '@core/errors/base-error'

export class UnauthenticatedError extends BaseError {
  readonly code = 'UNAUTHENTICATED'

  constructor(message = 'Autenticação necessária') {
    super(message)
  }
}
