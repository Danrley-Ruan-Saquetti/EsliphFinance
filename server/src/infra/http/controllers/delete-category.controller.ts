import { Controller, Delete, HttpCode, Param } from '@nestjs/common'
import { z } from 'zod'

import { DeleteCategoryUseCase } from '@domain/category/application/use-cases/delete-category'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'

const deleteCategoryParamsSchema = z.object({ id: z.uuid() })

type DeleteCategoryParams = z.infer<typeof deleteCategoryParamsSchema>

@Controller('/categories')
export class DeleteCategoryController {
  constructor(private readonly deleteCategory: DeleteCategoryUseCase) {}

  @Delete('/:id')
  @HttpCode(204)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Param(new ZodValidationPipe(deleteCategoryParamsSchema)) params: DeleteCategoryParams) {
    const result = await this.deleteCategory.execute({ categoryId: params.id, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }
  }
}
