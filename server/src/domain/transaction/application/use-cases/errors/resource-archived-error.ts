import { BaseError } from '@core/errors/base-error'

export class ResourceArchivedError extends BaseError {
  readonly code = 'RESOURCE_ARCHIVED'

  constructor(message = 'Registro arquivado') {
    super(message)
  }
}
