import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'

import { RefreshSessionUseCase } from '@domain/user/application/use-cases/refresh-session'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'

const refreshSessionBodySchema = z.object({
  refreshToken: z.string().min(1),
})

type RefreshSessionBody = z.infer<typeof refreshSessionBodySchema>

@Controller('/sessions/refresh')
export class RefreshSessionController {
  constructor(private readonly refreshSession: RefreshSessionUseCase) {}

  @Post()
  @HttpCode(200)
  async handle(@Body(new ZodValidationPipe(refreshSessionBodySchema)) body: RefreshSessionBody) {
    const result = await this.refreshSession.execute(body)

    if (result.isLeft()) {
      throw result.value
    }

    return { accessToken: result.value.accessToken, refreshToken: result.value.refreshToken }
  }
}
