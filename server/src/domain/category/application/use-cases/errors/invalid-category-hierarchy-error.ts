import { BaseError } from '@core/errors/base-error'

export class InvalidCategoryHierarchyError extends BaseError {
  readonly code = 'INVALID_CATEGORY_HIERARCHY'

  constructor(message = 'A hierarquia de categorias é limitada a dois níveis') {
    super(message)
  }
}
