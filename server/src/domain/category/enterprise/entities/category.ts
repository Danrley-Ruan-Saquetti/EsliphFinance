import { AggregateRoot } from '@core/entities/aggregate-root'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Optional } from '@core/types/optional'
import { CATEGORY_NATURES, CategoryNature } from '@domain/category/enterprise/value-objects/category-nature'

export interface CategoryProps {
  ownerId: UniqueEntityID
  name: string
  nature: CategoryNature
  icon: string
  color: string
  createdAt: Date
  updatedAt?: Date | null
}

export class Category extends AggregateRoot<CategoryProps> {
  static readonly NAME_MAX_LENGTH = 120
  static readonly ICON_MAX_LENGTH = 60
  static readonly ICON_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
  static readonly COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
  static readonly INCOME_NATURE: CategoryNature = 'INCOME'
  static readonly EXPENSE_NATURE: CategoryNature = 'EXPENSE'
  static readonly BOTH_NATURE: CategoryNature = 'BOTH'

  static create(props: Optional<CategoryProps, 'createdAt'>, id?: UniqueEntityID): Category {
    const name = Category.validateName(props.name)
    const nature = Category.validateNature(props.nature)
    const icon = Category.validateIcon(props.icon)
    const color = Category.validateColor(props.color)

    return new Category({ ...props, name, nature, icon, color, createdAt: props.createdAt ?? new Date() }, id)
  }

  private static validateName(name: string): string {
    const normalized = name.trim()

    if (!normalized) {
      throw new InvariantError('O nome da categoria não pode ser vazio')
    }
    if (normalized.length > Category.NAME_MAX_LENGTH) {
      throw new InvariantError(`O nome da categoria não pode ter mais de ${Category.NAME_MAX_LENGTH} caracteres`)
    }

    return normalized
  }

  private static validateNature(nature: CategoryNature): CategoryNature {
    if (!CATEGORY_NATURES.includes(nature)) {
      throw new InvariantError('A natureza da categoria é inválida')
    }

    return nature
  }

  private static validateIcon(icon: string): string {
    const normalized = icon.trim().toLowerCase()

    if (normalized.length > Category.ICON_MAX_LENGTH) {
      throw new InvariantError(`O ícone da categoria não pode ter mais de ${Category.ICON_MAX_LENGTH} caracteres`)
    }
    if (!Category.ICON_PATTERN.test(normalized)) {
      throw new InvariantError('O ícone da categoria deve conter apenas letras minúsculas, números e hífen')
    }

    return normalized
  }

  private static validateColor(color: string): string {
    const normalized = color.trim().toUpperCase()

    if (!Category.COLOR_PATTERN.test(normalized)) {
      throw new InvariantError('A cor da categoria deve estar no formato hexadecimal #RRGGBB')
    }

    return normalized
  }

  get ownerId(): UniqueEntityID {
    return this.props.ownerId
  }

  get name(): string {
    return this.props.name
  }

  get nature(): CategoryNature {
    return this.props.nature
  }

  get icon(): string {
    return this.props.icon
  }

  get color(): string {
    return this.props.color
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date | null | undefined {
    return this.props.updatedAt
  }
}
