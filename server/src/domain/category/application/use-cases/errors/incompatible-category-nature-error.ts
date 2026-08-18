import { BaseError } from '@core/errors/base-error'

export class IncompatibleCategoryNatureError extends BaseError {
  readonly code = 'INCOMPATIBLE_CATEGORY_NATURE'

  constructor(message = 'A natureza da subcategoria é incompatível com a categoria pai') {
    super(message)
  }
}
