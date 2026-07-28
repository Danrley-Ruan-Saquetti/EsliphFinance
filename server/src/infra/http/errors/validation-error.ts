import { BaseError } from '@core/errors/base-error'
import { FieldError } from '@infra/http/errors/field-error'

export class ValidationError extends BaseError {
  readonly code = 'VALIDATION_FAILED'

  constructor(readonly details: FieldError[]) {
    super('Validation failed')
  }
}
