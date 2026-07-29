import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { User, UserProps } from '@domain/user/enterprise/entities/user'
import { Email } from '@domain/user/enterprise/value-objects/email'

export function makeUser(override: Partial<UserProps> = {}, id?: UniqueEntityID): User {
  return User.create({ name: 'Fulano de Tal', email: Email.create('fulano@exemplo.com'), passwordHash: 'hash-da-senha', ...override }, id)
}
