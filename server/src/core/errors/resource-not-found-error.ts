import { BaseError } from '@core/errors/base-error'

export class ResourceNotFoundError extends BaseError {
  readonly code = 'RESOURCE_NOT_FOUND'

  constructor(resource = 'Resource') {
    super(`${resource} not found`)
  }
}
