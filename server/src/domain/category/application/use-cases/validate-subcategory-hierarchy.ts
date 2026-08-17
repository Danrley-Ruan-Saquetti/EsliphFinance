import { IncompatibleCategoryNatureError } from '@domain/category/application/use-cases/errors/incompatible-category-nature-error'
import { InvalidCategoryHierarchyError } from '@domain/category/application/use-cases/errors/invalid-category-hierarchy-error'
import { Category } from '@domain/category/enterprise/entities/category'
import { CategoryNature } from '@domain/category/enterprise/value-objects/category-nature'

export function validateSubcategoryHierarchy(
  parent: Category,
  childNature: CategoryNature,
): InvalidCategoryHierarchyError | IncompatibleCategoryNatureError | null {
  if (parent.parentId) {
    return new InvalidCategoryHierarchyError('Uma categoria não pode ser subcategoria de outra subcategoria')
  }

  if (parent.nature !== Category.BOTH_NATURE && parent.nature !== childNature) {
    return new IncompatibleCategoryNatureError()
  }

  return null
}
