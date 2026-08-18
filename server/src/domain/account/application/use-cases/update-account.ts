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

export interface UpdateAccountRequest {
  accountId: string
  ownerId: string
  accountGroupId: string
  name: string
  initialBalance?: Money
  icon?: string
  color: string
  creditCard?: CreditCardSettingsInput
}

export type UpdateAccountResponse = Either<ResourceNotFoundError | InvalidAccountGroupTypeError, { account: Account }>

export class UpdateAccountUseCase implements UseCase<UpdateAccountRequest, UpdateAccountResponse> {
  constructor(
    private readonly accountsRepository: AccountsRepository,
    private readonly accountGroupsRepository: AccountGroupsRepository,
  ) {}

  async execute({ accountId, ownerId, accountGroupId, name, initialBalance, icon, color, creditCard }: UpdateAccountRequest): Promise<UpdateAccountResponse> {
    const account = await this.accountsRepository.findById(accountId)

    if (!account || !this.isAccountOwnedBy(account, ownerId)) {
      return left(new ResourceNotFoundError('Conta não encontrada'))
    }

    const currentGroup = await this.accountGroupsRepository.findById(account.accountGroupId.toString())

    if (!currentGroup) {
      return left(new ResourceNotFoundError('Grupo de contas não encontrado'))
    }

    const isSameGroup = accountGroupId === account.accountGroupId.toString()
    const targetGroup = isSameGroup ? currentGroup : await this.accountGroupsRepository.findById(accountGroupId)

    if (!targetGroup || !this.isGroupOwnedBy(targetGroup.accountGroup, ownerId)) {
      return left(new ResourceNotFoundError('Grupo de contas não encontrado'))
    }

    if (targetGroup.accountGroup.type !== currentGroup.accountGroup.type) {
      return left(new InvalidAccountGroupTypeError('A troca de grupo só é permitida entre grupos do mesmo tipo'))
    }

    const isCreditCardGroup = targetGroup.accountGroup.type === AccountGroup.CREDIT_CARD_TYPE

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

    account.update({
      accountGroupId: new UniqueEntityID(accountGroupId),
      name,
      initialBalance: initialBalance ?? account.initialBalance,
      icon: icon ?? account.icon,
      color,
      creditCard: creditCard ? CreditCardSettings.create(creditCard) : null,
    })

    await this.accountsRepository.save(account)

    return right({ account })
  }

  private isAccountOwnedBy(account: Account, ownerId: string): boolean {
    return account.ownerId.toString() === ownerId
  }

  private isGroupOwnedBy(accountGroup: AccountGroup, ownerId: string): boolean {
    return accountGroup.ownerId.toString() === ownerId
  }
}
