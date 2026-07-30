import { Body, Controller, HttpCode, Put } from '@nestjs/common'
import { z } from 'zod'

import { UpdateUserProfileUseCase } from '@domain/user/application/use-cases/update-user-profile'
import { User } from '@domain/user/enterprise/entities/user'
import { Email } from '@domain/user/enterprise/value-objects/email'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { UserPresenter } from '@infra/http/presenters/user-presenter'

const updateUserProfileBodySchema = z.object({
  name: z.string().min(1).max(User.NAME_MAX_LENGTH),
  email: z.email().max(Email.MAX_LENGTH),
})

type UpdateUserProfileBody = z.infer<typeof updateUserProfileBodySchema>

@Controller('/users/me')
export class UpdateUserProfileController {
  constructor(private readonly updateUserProfile: UpdateUserProfileUseCase) {}

  @Put()
  @HttpCode(200)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Body(new ZodValidationPipe(updateUserProfileBodySchema)) body: UpdateUserProfileBody) {
    const result = await this.updateUserProfile.execute({ userId: currentUser.id, ...body })

    if (result.isLeft()) {
      throw result.value
    }

    return { user: UserPresenter.toHTTP(result.value.user) }
  }
}
