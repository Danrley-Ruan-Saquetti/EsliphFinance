import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Money } from '@core/value-objects/money'
import { Account } from '@domain/account/enterprise/entities/account'
import { CreditCardSettings } from '@domain/account/enterprise/value-objects/credit-card-settings'
import { accounts } from '@infra/database/drizzle/schemas/accounts'

export type AccountRecord = typeof accounts.$inferSelect
export type AccountInsert = typeof accounts.$inferInsert

export class DrizzleAccountMapper {
  static toDomain(record: AccountRecord): Account {
    return Account.create(
      {
        ownerId: new UniqueEntityID(record.ownerId),
        accountGroupId: new UniqueEntityID(record.accountGroupId),
        name: record.name,
        initialBalance: Money.fromCents(record.initialBalance),
        icon: record.icon,
        color: record.color,
        creditCard: DrizzleAccountMapper.toCreditCardSettings(record),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        archivedAt: record.archivedAt,
      },
      new UniqueEntityID(record.id),
    )
  }

  static toPersistence(account: Account): AccountInsert {
    return {
      id: account.id.toString(),
      ownerId: account.ownerId.toString(),
      accountGroupId: account.accountGroupId.toString(),
      name: account.name,
      initialBalance: account.initialBalance.amountInCents,
      icon: account.icon,
      color: account.color,
      creditLimit: account.creditCard?.limit.amountInCents ?? null,
      closingDay: account.creditCard?.closingDay.day ?? null,
      dueDay: account.creditCard?.dueDay.day ?? null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt ?? null,
      archivedAt: account.archivedAt ?? null,
    }
  }

  private static toCreditCardSettings({ creditLimit, closingDay, dueDay }: AccountRecord): CreditCardSettings | null {
    if (creditLimit === null || closingDay === null || dueDay === null) {
      return null
    }

    return CreditCardSettings.create({ limit: Money.fromCents(creditLimit), closingDay, dueDay })
  }
}
