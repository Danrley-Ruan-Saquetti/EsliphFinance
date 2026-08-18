import { AggregateRoot } from '@core/entities/aggregate-root'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Optional } from '@core/types/optional'
import { Money } from '@core/value-objects/money'
import { CreditCardSettings } from '@domain/account/enterprise/value-objects/credit-card-settings'

export interface AccountProps {
  ownerId: UniqueEntityID
  accountGroupId: UniqueEntityID
  name: string
  initialBalance: Money
  icon: string
  color: string
  creditCard: CreditCardSettings | null
  createdAt: Date
  updatedAt?: Date | null
  archivedAt?: Date | null
}

export class Account extends AggregateRoot<AccountProps> {
  static readonly NAME_MAX_LENGTH = 120
  static readonly ICON_MAX_LENGTH = 60
  static readonly ICON_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
  static readonly COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
  static readonly DEFAULT_ICON = 'wallet'

  static create(props: Optional<AccountProps, 'createdAt' | 'initialBalance' | 'icon' | 'creditCard'>, id?: UniqueEntityID): Account {
    const name = Account.validateName(props.name)
    const icon = Account.validateIcon(props.icon ?? Account.DEFAULT_ICON)
    const color = Account.validateColor(props.color)
    const creditCard = props.creditCard ?? null
    const initialBalance = Account.validateInitialBalance(props.initialBalance ?? Money.zero(), creditCard)

    return new Account({ ...props, name, icon, color, creditCard, initialBalance, createdAt: props.createdAt ?? new Date() }, id)
  }

  private static validateName(name: string): string {
    const normalized = name.trim()

    if (!normalized) {
      throw new InvariantError('O nome da conta não pode ser vazio')
    }
    if (normalized.length > Account.NAME_MAX_LENGTH) {
      throw new InvariantError(`O nome da conta não pode ter mais de ${Account.NAME_MAX_LENGTH} caracteres`)
    }

    return normalized
  }

  private static validateIcon(icon: string): string {
    const normalized = icon.trim().toLowerCase()

    if (normalized.length > Account.ICON_MAX_LENGTH) {
      throw new InvariantError(`O ícone da conta não pode ter mais de ${Account.ICON_MAX_LENGTH} caracteres`)
    }
    if (!Account.ICON_PATTERN.test(normalized)) {
      throw new InvariantError('O ícone da conta deve conter apenas letras minúsculas, números e hífen')
    }

    return normalized
  }

  private static validateColor(color: string): string {
    const normalized = color.trim().toUpperCase()

    if (!Account.COLOR_PATTERN.test(normalized)) {
      throw new InvariantError('A cor da conta deve estar no formato hexadecimal #RRGGBB')
    }

    return normalized
  }

  private static validateInitialBalance(initialBalance: Money, creditCard: CreditCardSettings | null): Money {
    if (creditCard && initialBalance.amountInCents !== 0) {
      throw new InvariantError('A conta de cartão de crédito não possui saldo inicial')
    }

    return initialBalance
  }

  get ownerId(): UniqueEntityID {
    return this.props.ownerId
  }

  get accountGroupId(): UniqueEntityID {
    return this.props.accountGroupId
  }

  get name(): string {
    return this.props.name
  }

  get initialBalance(): Money {
    return this.props.initialBalance
  }

  get icon(): string {
    return this.props.icon
  }

  get color(): string {
    return this.props.color
  }

  get creditCard(): CreditCardSettings | null {
    return this.props.creditCard
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date | null | undefined {
    return this.props.updatedAt
  }

  get archivedAt(): Date | null | undefined {
    return this.props.archivedAt
  }

  get isArchived(): boolean {
    return Boolean(this.props.archivedAt)
  }

  archive(): void {
    this.props.archivedAt = new Date()
    this.touch()
  }

  unarchive(): void {
    this.props.archivedAt = null
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }
}
