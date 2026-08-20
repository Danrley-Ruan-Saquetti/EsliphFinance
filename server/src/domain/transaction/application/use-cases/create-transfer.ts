import { Either, left, right } from '@core/either'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { Money } from '@core/value-objects/money'
import { AccountGroupsRepository } from '@domain/account-group/application/repositories/account-groups-repository'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { AccountsRepository } from '@domain/account/application/repositories/accounts-repository'
import { Account } from '@domain/account/enterprise/entities/account'
import { TransactionsRepository } from '@domain/transaction/application/repositories/transactions-repository'
import { InvalidTransferAccountError } from '@domain/transaction/application/use-cases/errors/invalid-transfer-account-error'
import { ResourceArchivedError } from '@domain/transaction/application/use-cases/errors/resource-archived-error'
import { resolveDefaultTransactionStatus } from '@domain/transaction/application/use-cases/resolve-default-transaction-status'
import { Transaction } from '@domain/transaction/enterprise/entities/transaction'
import { TransactionStatus } from '@domain/transaction/enterprise/value-objects/transaction-status'
import { UsersRepository } from '@domain/user/application/repositories/users-repository'

export interface CreateTransferRequest {
  ownerId: string
  sourceAccountId: string
  destinationAccountId: string
  status?: TransactionStatus
  date: Date
  amount: Money
  description?: string | null
}

export type CreateTransferResponse = Either<ResourceNotFoundError | ResourceArchivedError | InvalidTransferAccountError, { transaction: Transaction }>

export class CreateTransferUseCase implements UseCase<CreateTransferRequest, CreateTransferResponse> {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly accountsRepository: AccountsRepository,
    private readonly accountGroupsRepository: AccountGroupsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute({ ownerId, sourceAccountId, destinationAccountId, status, date, amount, description }: CreateTransferRequest): Promise<CreateTransferResponse> {
    if (sourceAccountId === destinationAccountId) {
      return left(new InvalidTransferAccountError('A conta de origem e a conta de destino não podem ser a mesma'))
    }

    const source = await this.loadTransferAccount(sourceAccountId, ownerId)

    if (source.isLeft()) {
      return left(source.value)
    }

    const destination = await this.loadTransferAccount(destinationAccountId, ownerId)

    if (destination.isLeft()) {
      return left(destination.value)
    }

    const resolvedStatus = status ?? (await resolveDefaultTransactionStatus(this.usersRepository, ownerId, date))

    const transaction = Transaction.create({
      ownerId: new UniqueEntityID(ownerId),
      accountId: null,
      categoryId: null,
      sourceAccountId: new UniqueEntityID(sourceAccountId),
      destinationAccountId: new UniqueEntityID(destinationAccountId),
      type: Transaction.TRANSFER_TYPE,
      status: resolvedStatus,
      date,
      amount,
      description,
    })

    await this.transactionsRepository.create(transaction)

    return right({ transaction })
  }

  private async loadTransferAccount(
    accountId: string,
    ownerId: string,
  ): Promise<Either<ResourceNotFoundError | ResourceArchivedError | InvalidTransferAccountError, Account>> {
    const account = await this.accountsRepository.findById(accountId)

    if (!account || account.ownerId.toString() !== ownerId) {
      return left(new ResourceNotFoundError('Conta não encontrada'))
    }
    if (account.isArchived) {
      return left(new ResourceArchivedError('A conta está arquivada e não pode ser usada em novos lançamentos'))
    }

    const group = await this.accountGroupsRepository.findById(account.accountGroupId.toString())

    if (!group || group.accountGroup.type !== AccountGroup.DEFAULT_TYPE) {
      return left(new InvalidTransferAccountError('A conta de origem e a conta de destino da transferência devem pertencer a um grupo do tipo "Padrão"'))
    }

    return right(account)
  }
}
