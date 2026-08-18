import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Category, CategoryProps } from '@domain/category/enterprise/entities/category'

export function makeCategory(override: Partial<CategoryProps> = {}, id?: UniqueEntityID): Category {
  return Category.create(
    { ownerId: new UniqueEntityID(), parentId: null, archivedAt: null, name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935', ...override },
    id,
  )
}
