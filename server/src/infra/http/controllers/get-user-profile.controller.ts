import { Controller, Get } from '@nestjs/common'

import { GetUserProfileUseCase } from '@domain/user/application/use-cases/get-user-profile'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { UserPresenter } from '@infra/http/presenters/user-presenter'

@Controller('/users/me')
export class GetUserProfileController {
  constructor(private readonly getUserProfile: GetUserProfileUseCase) {}

  @Get()
  async handle(@CurrentUser() currentUser: AuthenticatedUser) {
    const result = await this.getUserProfile.execute({ userId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { user: UserPresenter.toHTTP(result.value.user) }
  }
}
