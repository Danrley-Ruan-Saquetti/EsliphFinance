import { BaseError } from '@core/errors/base-error'

export class InvalidRefreshTokenError extends BaseError {
  readonly code = 'INVALID_REFRESH_TOKEN'

  constructor(message = 'Token de renovação inválido ou expirado') {
    super(message)
  }
}
