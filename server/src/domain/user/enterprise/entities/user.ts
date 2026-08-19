import { AggregateRoot } from '@core/entities/aggregate-root'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Optional } from '@core/types/optional'
import { DEFAULT_TRANSACTION_STATUSES, DefaultTransactionStatus } from '@domain/user/enterprise/value-objects/default-transaction-status'
import { Email } from '@domain/user/enterprise/value-objects/email'

export interface UserProps {
  name: string
  email: Email
  passwordHash: string
  defaultTransactionStatus?: DefaultTransactionStatus | null
  createdAt: Date
  updatedAt?: Date | null
  deletedAt?: Date | null
}

export class User extends AggregateRoot<UserProps> {
  static readonly NAME_MAX_LENGTH = 120

  static create(props: Optional<UserProps, 'createdAt'>, id?: UniqueEntityID): User {
    const name = User.validateName(props.name)
    const defaultTransactionStatus = User.validateDefaultTransactionStatus(props.defaultTransactionStatus)

    return new User({ ...props, name, defaultTransactionStatus, createdAt: props.createdAt ?? new Date() }, id)
  }

  private static validateName(name: string): string {
    const normalized = name.trim()

    if (!normalized) {
      throw new InvariantError('O nome do usuário não pode ser vazio')
    }
    if (normalized.length > User.NAME_MAX_LENGTH) {
      throw new InvariantError(`O nome do usuário não pode ter mais de ${User.NAME_MAX_LENGTH} caracteres`)
    }

    return normalized
  }

  private static validateDefaultTransactionStatus(defaultTransactionStatus?: DefaultTransactionStatus | null): DefaultTransactionStatus | null {
    if (!defaultTransactionStatus) {
      return null
    }
    if (!DEFAULT_TRANSACTION_STATUSES.includes(defaultTransactionStatus)) {
      throw new InvariantError('A situação padrão de transação preferida é inválida')
    }

    return defaultTransactionStatus
  }

  get name(): string {
    return this.props.name
  }

  get email(): Email {
    return this.props.email
  }

  get passwordHash(): string {
    return this.props.passwordHash
  }

  get defaultTransactionStatus(): DefaultTransactionStatus | null {
    return this.props.defaultTransactionStatus ?? null
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date | null | undefined {
    return this.props.updatedAt
  }

  get deletedAt(): Date | null | undefined {
    return this.props.deletedAt
  }

  get isDeleted(): boolean {
    return Boolean(this.props.deletedAt)
  }

  changeName(name: string): void {
    this.props.name = User.validateName(name)
    this.touch()
  }

  changeEmail(email: Email): void {
    this.props.email = email
    this.touch()
  }

  changeDefaultTransactionStatus(defaultTransactionStatus: DefaultTransactionStatus | null): void {
    this.props.defaultTransactionStatus = User.validateDefaultTransactionStatus(defaultTransactionStatus)
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }
}
