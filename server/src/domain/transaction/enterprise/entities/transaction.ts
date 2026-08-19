import { AggregateRoot } from '@core/entities/aggregate-root'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Optional } from '@core/types/optional'
import { Money } from '@core/value-objects/money'
import { TRANSACTION_STATUSES, TransactionStatus } from '@domain/transaction/enterprise/value-objects/transaction-status'
import { TRANSACTION_TYPES, TransactionType } from '@domain/transaction/enterprise/value-objects/transaction-type'

export interface TransactionProps {
  ownerId: UniqueEntityID
  accountId: UniqueEntityID
  categoryId: UniqueEntityID | null
  type: TransactionType
  status: TransactionStatus
  date: Date
  amount: Money
  description?: string | null
  createdAt: Date
  updatedAt?: Date | null
}

export class Transaction extends AggregateRoot<TransactionProps> {
  static readonly INCOME_TYPE: TransactionType = 'INCOME'
  static readonly EXPENSE_TYPE: TransactionType = 'EXPENSE'
  static readonly TRANSFER_TYPE: TransactionType = 'TRANSFER'
  static readonly CATEGORIZABLE_TYPES: readonly TransactionType[] = [Transaction.INCOME_TYPE, Transaction.EXPENSE_TYPE]
  static readonly PLANNED_STATUS: TransactionStatus = 'PLANNED'
  static readonly SETTLED_STATUS: TransactionStatus = 'SETTLED'

  static create(props: Optional<TransactionProps, 'createdAt'>, id?: UniqueEntityID): Transaction {
    const type = Transaction.validateType(props.type)
    const status = Transaction.validateStatus(props.status)
    const amount = Transaction.validateAmount(props.amount)
    const categoryId = Transaction.validateCategory(type, props.categoryId)
    const description = Transaction.normalizeDescription(props.description)

    return new Transaction({ ...props, type, status, amount, categoryId, description, createdAt: props.createdAt ?? new Date() }, id)
  }

  private static validateType(type: TransactionType): TransactionType {
    if (!TRANSACTION_TYPES.includes(type)) {
      throw new InvariantError('O tipo da transação é inválido')
    }

    return type
  }

  private static validateStatus(status: TransactionStatus): TransactionStatus {
    if (!TRANSACTION_STATUSES.includes(status)) {
      throw new InvariantError('A situação da transação é inválida')
    }

    return status
  }

  private static validateAmount(amount: Money): Money {
    if (amount.amountInCents <= 0) {
      throw new InvariantError('O valor da transação deve ser maior que zero')
    }

    return amount
  }

  private static validateCategory(type: TransactionType, categoryId: UniqueEntityID | null): UniqueEntityID | null {
    const requiresCategory = Transaction.CATEGORIZABLE_TYPES.includes(type)

    if (requiresCategory && !categoryId) {
      throw new InvariantError('A categoria é obrigatória para transações de receita ou despesa')
    }
    if (!requiresCategory && categoryId) {
      throw new InvariantError('A transação de transferência não possui categoria')
    }

    return categoryId ?? null
  }

  private static normalizeDescription(description?: string | null): string | null {
    const normalized = description?.trim()

    return normalized ? normalized : null
  }

  get ownerId(): UniqueEntityID {
    return this.props.ownerId
  }

  get accountId(): UniqueEntityID {
    return this.props.accountId
  }

  get categoryId(): UniqueEntityID | null {
    return this.props.categoryId
  }

  get type(): TransactionType {
    return this.props.type
  }

  get status(): TransactionStatus {
    return this.props.status
  }

  get date(): Date {
    return this.props.date
  }

  get amount(): Money {
    return this.props.amount
  }

  get description(): string | null {
    return this.props.description ?? null
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date | null | undefined {
    return this.props.updatedAt
  }
}
