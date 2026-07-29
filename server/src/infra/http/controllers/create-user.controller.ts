import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'

import { CreateUserUseCase } from '@domain/user/application/use-cases/create-user'
import { User } from '@domain/user/enterprise/entities/user'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { Password } from '@domain/user/enterprise/value-objects/password'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { UserPresenter } from '@infra/http/presenters/user-presenter'

const createUserBodySchema = z.object({
  name: z.string().min(1).max(User.NAME_MAX_LENGTH),
  email: z.email().max(Email.MAX_LENGTH),
  password: z.string().min(Password.MIN_LENGTH),
})

type CreateUserBody = z.infer<typeof createUserBodySchema>

@Controller('/users')
export class CreateUserController {
  constructor(private readonly createUser: CreateUserUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(@Body(new ZodValidationPipe(createUserBodySchema)) body: CreateUserBody) {
    const result = await this.createUser.execute(body)

    if (result.isLeft()) {
      throw result.value
    }

    return { user: UserPresenter.toHTTP(result.value.user) }
  }
}
