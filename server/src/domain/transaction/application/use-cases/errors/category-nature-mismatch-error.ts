import { BaseError } from '@core/errors/base-error'

export class CategoryNatureMismatchError extends BaseError {
  readonly code = 'CATEGORY_NATURE_MISMATCH'

  constructor(message = 'A natureza da categoria é incompatível com o tipo da transação') {
    super(message)
  }
}
