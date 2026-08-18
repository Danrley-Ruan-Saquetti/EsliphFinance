import { Injectable } from '@nestjs/common'
import { and, eq, isNull, or } from 'drizzle-orm'

import { CategoriesRepository, FindManyByOwnerIdOptions } from '@domain/category/application/repositories/categories-repository'
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

  async save(category: Category): Promise<void> {
    await this.drizzle.db.update(categories).set(DrizzleCategoryMapper.toPersistence(category)).where(eq(categories.id, category.id.toString()))
  }

  async delete(id: string): Promise<void> {
    await this.drizzle.db.delete(categories).where(eq(categories.id, id))
  }

  async findById(id: string): Promise<Category | null> {
    const [record] = await this.drizzle.db.select().from(categories).where(eq(categories.id, id)).limit(1)

    return record ? DrizzleCategoryMapper.toDomain(record) : null
  }

  async findManyByOwnerId(ownerId: string, options: FindManyByOwnerIdOptions = {}): Promise<Category[]> {
    const conditions = [eq(categories.ownerId, ownerId)]

    if (options.nature) {
      const natureCondition = or(eq(categories.nature, options.nature), eq(categories.nature, Category.BOTH_NATURE))

      if (natureCondition) {
        conditions.push(natureCondition)
      }
    }
    if (!options.includeArchived) {
      conditions.push(isNull(categories.archivedAt))
    }

    const records = await this.drizzle.db
      .select()
      .from(categories)
      .where(and(...conditions))

    return records.map(DrizzleCategoryMapper.toDomain)
  }

  async hasSubcategories(parentId: string): Promise<boolean> {
    const [record] = await this.drizzle.db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, parentId)).limit(1)

    return Boolean(record)
  }
}
