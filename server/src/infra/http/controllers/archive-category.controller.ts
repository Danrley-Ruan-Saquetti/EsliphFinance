import { Controller, HttpCode, Param, Patch } from '@nestjs/common'
import { z } from 'zod'

import { ArchiveCategoryUseCase } from '@domain/category/application/use-cases/archive-category'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { CategoryPresenter } from '@infra/http/presenters/category-presenter'

const archiveCategoryParamsSchema = z.object({ id: z.uuid() })

type ArchiveCategoryParams = z.infer<typeof archiveCategoryParamsSchema>

@Controller('/categories')
export class ArchiveCategoryController {
  constructor(private readonly archiveCategory: ArchiveCategoryUseCase) {}

  @Patch('/:id/archive')
  @HttpCode(200)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Param(new ZodValidationPipe(archiveCategoryParamsSchema)) params: ArchiveCategoryParams) {
    const result = await this.archiveCategory.execute({ categoryId: params.id, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { category: CategoryPresenter.toHTTP(result.value.category) }
  }
}
