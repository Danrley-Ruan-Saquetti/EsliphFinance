import { CategoryTreeNode } from '@domain/category/application/use-cases/list-category-tree'
import { Category } from '@domain/category/enterprise/entities/category'

export class CategoryPresenter {
  static toHTTP(category: Category) {
    return {
      id: category.id.toString(),
      parentId: category.parentId?.toString() ?? null,
      name: category.name,
      nature: category.nature,
      icon: category.icon,
      color: category.color,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt ?? null,
      archivedAt: category.archivedAt ?? null,
    }
  }

  static toTreeHTTP(node: CategoryTreeNode) {
    return { ...CategoryPresenter.toHTTP(node.category), children: node.children.map(child => CategoryPresenter.toHTTP(child)) }
  }
}
