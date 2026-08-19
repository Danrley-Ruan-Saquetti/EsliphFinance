import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { User } from '@domain/user/enterprise/entities/user'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { users } from '@infra/database/drizzle/schemas/users'

export type UserRecord = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert

export class DrizzleUserMapper {
  static toDomain(record: UserRecord): User {
    return User.create(
      {
        name: record.name,
        email: Email.create(record.email),
        passwordHash: record.passwordHash,
        defaultTransactionStatus: record.defaultTransactionStatus,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityID(record.id),
    )
  }

  static toPersistence(user: User): UserInsert {
    return {
      id: user.id.toString(),
      name: user.name,
      email: user.email.value,
      passwordHash: user.passwordHash,
      defaultTransactionStatus: user.defaultTransactionStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt ?? null,
      deletedAt: user.deletedAt ?? null,
    }
  }
}
