import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import { CategoriesRepository } from '@domain/category/application/repositories/categories-repository'
import { Category } from '@domain/category/enterprise/entities/category'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { DrizzleCategoryMapper } from '@infra/database/drizzle/mappers/drizzle-category-mapper'
import { categories } from '@infra/database/drizzle/schemas/categories'

@Injectable()
export class DrizzleCategoriesRepository extends CategoriesRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super()
  }

  async create(category: Category): Promise<void> {
    await this.drizzle.db.insert(categories).values(DrizzleCategoryMapper.toPersistence(category))
  }

  async findById(id: string): Promise<Category | null> {
    const [record] = await this.drizzle.db.select().from(categories).where(eq(categories.id, id)).limit(1)

    return record ? DrizzleCategoryMapper.toDomain(record) : null
  }
}
