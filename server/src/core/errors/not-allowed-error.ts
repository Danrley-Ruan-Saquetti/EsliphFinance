import { BaseError } from '@core/errors/base-error'

export class NotAllowedError extends BaseError {
  readonly code = 'NOT_ALLOWED'

  constructor(message = 'Operation not allowed') {
    super(message)
  }
}
