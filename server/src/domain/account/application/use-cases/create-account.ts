import { Either, left, right } from '@core/either'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { Money } from '@core/value-objects/money'
import { AccountGroupsRepository } from '@domain/account-group/application/repositories/account-groups-repository'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { AccountsRepository } from '@domain/account/application/repositories/accounts-repository'
import { InvalidAccountGroupTypeError } from '@domain/account/application/use-cases/errors/invalid-account-group-type-error'
import { Account } from '@domain/account/enterprise/entities/account'

export interface CreateAccountRequest {
  ownerId: string
  accountGroupId: string
  name: string
  initialBalance?: Money
  icon?: string
  color: string
}

export type CreateAccountResponse = Either<ResourceNotFoundError | InvalidAccountGroupTypeError, { account: Account }>

export class CreateAccountUseCase implements UseCase<CreateAccountRequest, CreateAccountResponse> {
  constructor(
    private readonly accountsRepository: AccountsRepository,
    private readonly accountGroupsRepository: AccountGroupsRepository,
  ) {}

  async execute({ ownerId, accountGroupId, name, initialBalance, icon, color }: CreateAccountRequest): Promise<CreateAccountResponse> {
    const found = await this.accountGroupsRepository.findById(accountGroupId)

    if (!found || !this.isOwnedBy(found.accountGroup, ownerId)) {
      return left(new ResourceNotFoundError('Grupo de contas não encontrado'))
    }
    if (found.accountGroup.type !== AccountGroup.DEFAULT_TYPE) {
      return left(new InvalidAccountGroupTypeError('A conta deve pertencer a um grupo de contas do tipo "Padrão"'))
    }

    const account = Account.create({
      ownerId: new UniqueEntityID(ownerId),
      accountGroupId: new UniqueEntityID(accountGroupId),
      name,
      initialBalance,
      icon,
      color,
    })

    await this.accountsRepository.create(account)

    return right({ account })
  }

  private isOwnedBy(accountGroup: AccountGroup, ownerId: string): boolean {
    return accountGroup.ownerId.toString() === ownerId
  }
}
