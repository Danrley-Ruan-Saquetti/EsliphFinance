import { ArgumentMetadata, PipeTransform } from '@nestjs/common'
import { z, ZodType } from 'zod'

import { FieldError } from '@infra/http/errors/field-error'
import { ValidationError } from '@infra/http/errors/validation-error'

export class ZodValidationPipe<TSchema extends ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata): z.infer<TSchema> {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new ValidationError(this.toFieldErrors(result.error, metadata))
    }

    return result.data
  }

  private toFieldErrors(error: z.ZodError, metadata: ArgumentMetadata): FieldError[] {
    return error.issues.map(issue => ({ field: issue.path.join('.') || metadata.type, message: issue.message }))
  }
}
