import { HttpStatus } from '@nestjs/common'

const HTTP_STATUS_BY_ERROR_CODE: Record<string, HttpStatus | undefined> = {
  VALIDATION_FAILED: HttpStatus.UNPROCESSABLE_ENTITY,
  INVARIANT_VIOLATION: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  RESOURCE_NOT_FOUND: HttpStatus.NOT_FOUND,
  NOT_ALLOWED: HttpStatus.FORBIDDEN,
  INSECURE_TRANSPORT: HttpStatus.FORBIDDEN,
  EMAIL_ALREADY_IN_USE: HttpStatus.CONFLICT,
}

export function httpStatusByErrorCode(code: string): HttpStatus {
  return HTTP_STATUS_BY_ERROR_CODE[code] ?? HttpStatus.BAD_REQUEST
}
