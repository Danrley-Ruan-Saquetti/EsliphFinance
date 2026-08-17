import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'

import { CreateCategoryUseCase } from '@domain/category/application/use-cases/create-category'
import { Category } from '@domain/category/enterprise/entities/category'
import { CATEGORY_NATURES } from '@domain/category/enterprise/value-objects/category-nature'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { CategoryPresenter } from '@infra/http/presenters/category-presenter'

const createCategoryBodySchema = z.object({
  parentId: z.uuid().optional(),
  name: z.string().min(1).max(Category.NAME_MAX_LENGTH),
  nature: z.enum(CATEGORY_NATURES),
  icon: z.string().min(1).max(Category.ICON_MAX_LENGTH),
  color: z.string().regex(Category.COLOR_PATTERN, 'A cor deve estar no formato hexadecimal #RRGGBB'),
})

type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>

@Controller('/categories')
export class CreateCategoryController {
  constructor(private readonly createCategory: CreateCategoryUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Body(new ZodValidationPipe(createCategoryBodySchema)) body: CreateCategoryBody) {
    const result = await this.createCategory.execute({ ...body, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { category: CategoryPresenter.toHTTP(result.value.category) }
  }
}
