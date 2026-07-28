import { ArgumentMetadata } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { ValidationError } from '@infra/http/errors/validation-error'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'

const schema = z.object({ title: z.string().min(1), amountInCents: z.coerce.number().int() })
const bodyMetadata: ArgumentMetadata = { type: 'body' }

describe('ZodValidationPipe', () => {
  it('deve devolver o dado já parseado pelo schema', () => {
    const sut = new ZodValidationPipe(schema)

    expect(sut.transform({ title: 'Título', amountInCents: '1500' }, bodyMetadata)).toEqual({ title: 'Título', amountInCents: 1500 })
  })

  it('deve lançar ValidationError com um item por campo inválido', () => {
    const sut = new ZodValidationPipe(schema)

    try {
      sut.transform({ title: '', amountInCents: 'abc' }, bodyMetadata)
      expect.unreachable('deveria ter lançado')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)

      const { code, message, details } = error as ValidationError

      expect(code).toBe('VALIDATION_FAILED')
      expect(message).toBe('Validation failed')
      expect(details.map(detail => detail.field)).toEqual(['title', 'amountInCents'])
      expect(details.every(detail => detail.message.length > 0)).toBe(true)
    }
  })

  it('deve usar o caminho completo do campo aninhado', () => {
    const sut = new ZodValidationPipe(z.object({ owner: z.object({ id: z.uuid() }) }))

    try {
      sut.transform({ owner: { id: 'não-é-uuid' } }, bodyMetadata)
      expect.unreachable('deveria ter lançado')
    } catch (error) {
      expect((error as ValidationError).details[0].field).toBe('owner.id')
    }
  })

  it('deve usar a origem do argumento como campo quando o erro não é de um campo específico', () => {
    const sut = new ZodValidationPipe(schema)

    try {
      sut.transform('não é um objeto', { type: 'query' })
      expect.unreachable('deveria ter lançado')
    } catch (error) {
      expect((error as ValidationError).details[0].field).toBe('query')
    }
  })
})
