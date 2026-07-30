import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import { RefreshTokensRepository } from '@domain/user/application/repositories/refresh-tokens-repository'
import { RefreshToken } from '@domain/user/enterprise/entities/refresh-token'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { DrizzleRefreshTokenMapper } from '@infra/database/drizzle/mappers/drizzle-refresh-token-mapper'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'

@Injectable()
export class DrizzleRefreshTokensRepository extends RefreshTokensRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super()
  }

  async create(refreshToken: RefreshToken): Promise<void> {
    await this.drizzle.db.insert(refreshTokens).values(DrizzleRefreshTokenMapper.toPersistence(refreshToken))
  }

  async save(refreshToken: RefreshToken): Promise<void> {
    await this.drizzle.db
      .update(refreshTokens)
      .set(DrizzleRefreshTokenMapper.toPersistence(refreshToken))
      .where(eq(refreshTokens.id, refreshToken.id.toString()))
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const [record] = await this.drizzle.db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1)

    if (!record) {
      return null
    }

    return DrizzleRefreshTokenMapper.toDomain(record)
  }
}
