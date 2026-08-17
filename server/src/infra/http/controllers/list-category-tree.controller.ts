import { Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'

import { ListCategoryTreeUseCase } from '@domain/category/application/use-cases/list-category-tree'
import { CATEGORY_NATURES } from '@domain/category/enterprise/value-objects/category-nature'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { CategoryPresenter } from '@infra/http/presenters/category-presenter'

const listCategoryTreeQuerySchema = z.object({
  nature: z.enum(CATEGORY_NATURES).optional(),
  includeArchived: z.stringbool().optional(),
})

type ListCategoryTreeQuery = z.infer<typeof listCategoryTreeQuerySchema>

@Controller('/categories')
export class ListCategoryTreeController {
  constructor(private readonly listCategoryTree: ListCategoryTreeUseCase) {}

  @Get()
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Query(new ZodValidationPipe(listCategoryTreeQuerySchema)) query: ListCategoryTreeQuery) {
    const result = await this.listCategoryTree.execute({ ...query, ownerId: currentUser.id })

    return { categories: result.value.categories.map(node => CategoryPresenter.toTreeHTTP(node)) }
  }
}
