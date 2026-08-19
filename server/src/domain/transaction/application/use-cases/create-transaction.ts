import { Either, left, right } from '@core/either'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { Money } from '@core/value-objects/money'
import { AccountsRepository } from '@domain/account/application/repositories/accounts-repository'
import { CategoriesRepository } from '@domain/category/application/repositories/categories-repository'
import { Category } from '@domain/category/enterprise/entities/category'
import { TransactionsRepository } from '@domain/transaction/application/repositories/transactions-repository'
import { CategoryNatureMismatchError } from '@domain/transaction/application/use-cases/errors/category-nature-mismatch-error'
import { ResourceArchivedError } from '@domain/transaction/application/use-cases/errors/resource-archived-error'
import { Transaction } from '@domain/transaction/enterprise/entities/transaction'
import { TransactionStatus } from '@domain/transaction/enterprise/value-objects/transaction-status'

export interface CreateTransactionRequest {
  ownerId: string
  accountId: string
  categoryId: string
  type: 'INCOME' | 'EXPENSE'
  status: TransactionStatus
  date: Date
  amount: Money
  description?: string | null
}

export type CreateTransactionResponse = Either<ResourceNotFoundError | ResourceArchivedError | CategoryNatureMismatchError, { transaction: Transaction }>

export class CreateTransactionUseCase implements UseCase<CreateTransactionRequest, CreateTransactionResponse> {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly accountsRepository: AccountsRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  async execute({ ownerId, accountId, categoryId, type, status, date, amount, description }: CreateTransactionRequest): Promise<CreateTransactionResponse> {
    const account = await this.accountsRepository.findById(accountId)

    if (!account || account.ownerId.toString() !== ownerId) {
      return left(new ResourceNotFoundError('Conta não encontrada'))
    }
    if (account.isArchived) {
      return left(new ResourceArchivedError('A conta está arquivada e não pode ser usada em novos lançamentos'))
    }

    const category = await this.categoriesRepository.findById(categoryId)

    if (!category || category.ownerId.toString() !== ownerId) {
      return left(new ResourceNotFoundError('Categoria não encontrada'))
    }
    if (category.isArchived) {
      return left(new ResourceArchivedError('A categoria está arquivada e não pode ser usada em novos lançamentos'))
    }
    if (!this.isNatureCompatible(category.nature, type)) {
      return left(new CategoryNatureMismatchError())
    }

    const transaction = Transaction.create({
      ownerId: new UniqueEntityID(ownerId),
      accountId: new UniqueEntityID(accountId),
      categoryId: new UniqueEntityID(categoryId),
      type,
      status,
      date,
      amount,
      description,
    })

    await this.transactionsRepository.create(transaction)

    return right({ transaction })
  }

  private isNatureCompatible(nature: Category['nature'], type: CreateTransactionRequest['type']): boolean {
    return nature === Category.BOTH_NATURE || nature === type
  }
}
