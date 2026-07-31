import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { accountGroups } from '@infra/database/drizzle/schemas/account-groups'

export type AccountGroupRecord = typeof accountGroups.$inferSelect
export type AccountGroupInsert = typeof accountGroups.$inferInsert

export class DrizzleAccountGroupMapper {
  static toDomain(record: AccountGroupRecord): AccountGroup {
    return AccountGroup.create(
      {
        ownerId: new UniqueEntityID(record.ownerId),
        name: record.name,
        type: record.type,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      new UniqueEntityID(record.id),
    )
  }

  static toPersistence(accountGroup: AccountGroup): AccountGroupInsert {
    return {
      id: accountGroup.id.toString(),
      ownerId: accountGroup.ownerId.toString(),
      name: accountGroup.name,
      type: accountGroup.type,
      createdAt: accountGroup.createdAt,
      updatedAt: accountGroup.updatedAt ?? null,
    }
  }
}
