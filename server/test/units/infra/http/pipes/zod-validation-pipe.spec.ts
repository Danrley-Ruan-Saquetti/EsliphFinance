import { BadRequestException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'

const schema = z.object({ title: z.string().min(1), amountInCents: z.coerce.number().int() })

describe('ZodValidationPipe', () => {
  it('deve devolver o dado já parseado pelo schema', () => {
    const sut = new ZodValidationPipe(schema)

    expect(sut.transform({ title: 'Título', amountInCents: '1500' })).toEqual({ title: 'Título', amountInCents: 1500 })
  })

  it('deve lançar BadRequestException com os erros por campo', () => {
    const sut = new ZodValidationPipe(schema)

    try {
      sut.transform({ title: '', amountInCents: 'abc' })
      expect.unreachable('deveria ter lançado')
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException)

      const response = (error as BadRequestException).getResponse() as { message: string; errors: { fieldErrors: Record<string, string[]> } }

      expect(response.message).toBe('Validation failed')
      expect(response.errors.fieldErrors).toHaveProperty('title')
      expect(response.errors.fieldErrors).toHaveProperty('amountInCents')
    }
  })
})
