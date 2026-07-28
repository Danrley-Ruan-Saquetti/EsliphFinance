import { FieldError } from '@infra/http/errors/field-error'

export interface ErrorResponse {
  statusCode: number
  code: string
  message: string
  details?: FieldError[]
  path: string
  timestamp: string
  requestId: string
}
