import { BaseError } from '@core/errors/base-error'

export class InsecureTransportError extends BaseError {
  readonly code = 'INSECURE_TRANSPORT'

  constructor() {
    super('HTTPS is required')
  }
}
