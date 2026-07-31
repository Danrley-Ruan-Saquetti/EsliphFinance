import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { AccountGroup, AccountGroupProps } from '@domain/account-group/enterprise/entities/account-group'

export function makeAccountGroup(override: Partial<AccountGroupProps> = {}, id?: UniqueEntityID): AccountGroup {
  return AccountGroup.create({ ownerId: new UniqueEntityID(), name: 'Contas', type: 'DEFAULT', ...override }, id)
}
