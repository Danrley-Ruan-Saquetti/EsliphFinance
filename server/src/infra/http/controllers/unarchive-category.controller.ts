import { Controller, HttpCode, Param, Patch } from '@nestjs/common'
import { z } from 'zod'

import { UnarchiveCategoryUseCase } from '@domain/category/application/use-cases/unarchive-category'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { CategoryPresenter } from '@infra/http/presenters/category-presenter'

const unarchiveCategoryParamsSchema = z.object({ id: z.uuid() })

type UnarchiveCategoryParams = z.infer<typeof unarchiveCategoryParamsSchema>

@Controller('/categories')
export class UnarchiveCategoryController {
  constructor(private readonly unarchiveCategory: UnarchiveCategoryUseCase) {}

  @Patch('/:id/unarchive')
  @HttpCode(200)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Param(new ZodValidationPipe(unarchiveCategoryParamsSchema)) params: UnarchiveCategoryParams) {
    const result = await this.unarchiveCategory.execute({ categoryId: params.id, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { category: CategoryPresenter.toHTTP(result.value.category) }
  }
}
