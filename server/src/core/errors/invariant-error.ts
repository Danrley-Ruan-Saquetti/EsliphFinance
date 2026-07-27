import { BaseError } from '@core/errors/base-error'

export class InvariantError extends BaseError {
  readonly code = 'INVARIANT_VIOLATION'
}
