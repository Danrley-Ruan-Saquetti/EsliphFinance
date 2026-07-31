import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'

import { EndSessionUseCase } from '@domain/user/application/use-cases/end-session'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'

const endSessionBodySchema = z.object({
  refreshToken: z.string().min(1),
})

type EndSessionBody = z.infer<typeof endSessionBodySchema>

@Controller('/sessions/logout')
export class EndSessionController {
  constructor(private readonly endSession: EndSessionUseCase) {}

  @Post()
  @HttpCode(204)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Body(new ZodValidationPipe(endSessionBodySchema)) body: EndSessionBody): Promise<void> {
    await this.endSession.execute({ ...body, userId: currentUser.id })
  }
}
