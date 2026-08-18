import { AggregateRoot } from '@core/entities/aggregate-root'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Optional } from '@core/types/optional'
import { ACCOUNT_GROUP_TYPES, AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'

export interface AccountGroupProps {
  ownerId: UniqueEntityID
  name: string
  type: AccountGroupType
  createdAt: Date
  updatedAt?: Date | null
}

export class AccountGroup extends AggregateRoot<AccountGroupProps> {
  static readonly NAME_MAX_LENGTH = 120
  static readonly DEFAULT_TYPE: AccountGroupType = 'DEFAULT'
  static readonly CREDIT_CARD_TYPE: AccountGroupType = 'CREDIT_CARD'

  static create(props: Optional<AccountGroupProps, 'createdAt' | 'type'>, id?: UniqueEntityID): AccountGroup {
    const name = AccountGroup.validateName(props.name)
    const type = AccountGroup.validateType(props.type ?? AccountGroup.DEFAULT_TYPE)

    return new AccountGroup({ ...props, name, type, createdAt: props.createdAt ?? new Date() }, id)
  }

  private static validateName(name: string): string {
    const normalized = name.trim()

    if (!normalized) {
      throw new InvariantError('O nome do grupo de contas não pode ser vazio')
    }
    if (normalized.length > AccountGroup.NAME_MAX_LENGTH) {
      throw new InvariantError(`O nome do grupo de contas não pode ter mais de ${AccountGroup.NAME_MAX_LENGTH} caracteres`)
    }

    return normalized
  }

  private static validateType(type: AccountGroupType): AccountGroupType {
    if (!ACCOUNT_GROUP_TYPES.includes(type)) {
      throw new InvariantError('O tipo do grupo de contas é inválido')
    }

    return type
  }

  get ownerId(): UniqueEntityID {
    return this.props.ownerId
  }

  get name(): string {
    return this.props.name
  }

  get type(): AccountGroupType {
    return this.props.type
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date | null | undefined {
    return this.props.updatedAt
  }

  changeName(name: string): void {
    this.props.name = AccountGroup.validateName(name)
    this.touch()
  }

  changeType(type: AccountGroupType): void {
    this.props.type = AccountGroup.validateType(type)
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }
}
