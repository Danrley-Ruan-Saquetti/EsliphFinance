import { BaseError } from '@core/errors/base-error'

export class ResourceNotFoundError extends BaseError {
  readonly code = 'RESOURCE_NOT_FOUND'

  constructor(message = 'Registro não encontrado') {
    super(message)
  }
}
