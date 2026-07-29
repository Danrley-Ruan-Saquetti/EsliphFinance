import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { RefreshToken } from '@domain/user/enterprise/entities/refresh-token'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'

export type RefreshTokenRecord = typeof refreshTokens.$inferSelect
export type RefreshTokenInsert = typeof refreshTokens.$inferInsert

export class DrizzleRefreshTokenMapper {
  static toDomain(record: RefreshTokenRecord): RefreshToken {
    return RefreshToken.create(
      {
        userId: new UniqueEntityID(record.userId),
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt,
        revokedAt: record.revokedAt,
      },
      new UniqueEntityID(record.id),
    )
  }

  static toPersistence(refreshToken: RefreshToken): RefreshTokenInsert {
    return {
      id: refreshToken.id.toString(),
      userId: refreshToken.userId.toString(),
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt,
      createdAt: refreshToken.createdAt,
      revokedAt: refreshToken.revokedAt ?? null,
    }
  }
}
