import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'

import { AuthenticateUserUseCase } from '@domain/user/application/use-cases/authenticate-user'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'

const authenticateUserBodySchema = z.object({
  email: z.email().max(Email.MAX_LENGTH),
  password: z.string().min(1),
})

type AuthenticateUserBody = z.infer<typeof authenticateUserBodySchema>

@Controller('/sessions')
export class AuthenticateUserController {
  constructor(private readonly authenticateUser: AuthenticateUserUseCase) {}

  @Post()
  @HttpCode(200)
  async handle(@Body(new ZodValidationPipe(authenticateUserBodySchema)) body: AuthenticateUserBody) {
    const result = await this.authenticateUser.execute(body)

    if (result.isLeft()) {
      throw result.value
    }

    return { accessToken: result.value.accessToken, refreshToken: result.value.refreshToken }
  }
}
