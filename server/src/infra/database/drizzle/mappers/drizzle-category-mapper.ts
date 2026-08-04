import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Category } from '@domain/category/enterprise/entities/category'
import { categories } from '@infra/database/drizzle/schemas/categories'

export type CategoryRecord = typeof categories.$inferSelect
export type CategoryInsert = typeof categories.$inferInsert

export class DrizzleCategoryMapper {
  static toDomain(record: CategoryRecord): Category {
    return Category.create(
      {
        ownerId: new UniqueEntityID(record.ownerId),
        name: record.name,
        nature: record.nature,
        icon: record.icon,
        color: record.color,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      new UniqueEntityID(record.id),
    )
  }

  static toPersistence(category: Category): CategoryInsert {
    return {
      id: category.id.toString(),
      ownerId: category.ownerId.toString(),
      name: category.name,
      nature: category.nature,
      icon: category.icon,
      color: category.color,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt ?? null,
    }
  }
}
