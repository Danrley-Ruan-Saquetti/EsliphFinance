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
import { CreditCardSettings, CreditCardSettingsInput } from '@domain/account/enterprise/value-objects/credit-card-settings'

export interface CreateAccountRequest {
  ownerId: string
  accountGroupId: string
  name: string
  initialBalance?: Money
  icon?: string
  color: string
  creditCard?: CreditCardSettingsInput
}

export type CreateAccountResponse = Either<ResourceNotFoundError | InvalidAccountGroupTypeError, { account: Account }>

export class CreateAccountUseCase implements UseCase<CreateAccountRequest, CreateAccountResponse> {
  constructor(
    private readonly accountsRepository: AccountsRepository,
    private readonly accountGroupsRepository: AccountGroupsRepository,
  ) {}

  async execute({ ownerId, accountGroupId, name, initialBalance, icon, color, creditCard }: CreateAccountRequest): Promise<CreateAccountResponse> {
    const found = await this.accountGroupsRepository.findById(accountGroupId)

    if (!found || !this.isOwnedBy(found.accountGroup, ownerId)) {
      return left(new ResourceNotFoundError('Grupo de contas não encontrado'))
    }

    const isCreditCardGroup = found.accountGroup.type === AccountGroup.CREDIT_CARD_TYPE

    if (isCreditCardGroup && !creditCard) {
      return left(new InvalidAccountGroupTypeError('O limite, o dia de fechamento e o dia de vencimento são obrigatórios para contas de cartão de crédito'))
    }
    if (!isCreditCardGroup && creditCard) {
      return left(
        new InvalidAccountGroupTypeError(
          'O limite, o dia de fechamento e o dia de vencimento só podem ser informados para contas de um grupo do tipo "Cartão de Crédito"',
        ),
      )
    }

    const account = Account.create({
      ownerId: new UniqueEntityID(ownerId),
      accountGroupId: new UniqueEntityID(accountGroupId),
      name,
      initialBalance,
      icon,
      color,
      creditCard: creditCard ? CreditCardSettings.create(creditCard) : null,
    })

    await this.accountsRepository.create(account)

    return right({ account })
  }

  private isOwnedBy(accountGroup: AccountGroup, ownerId: string): boolean {
    return accountGroup.ownerId.toString() === ownerId
  }
}
