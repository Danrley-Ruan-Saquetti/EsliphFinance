import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Money } from '@core/value-objects/money'
import { Account, AccountProps } from '@domain/account/enterprise/entities/account'

export function makeAccount(override: Partial<AccountProps> = {}, id?: UniqueEntityID): Account {
  return Account.create(
    {
      ownerId: new UniqueEntityID(),
      accountGroupId: new UniqueEntityID(),
      name: 'Carteira',
      initialBalance: Money.zero(),
      icon: 'wallet',
      color: '#1E88E5',
      creditCard: null,
      ...override,
    },
    id,
  )
}
