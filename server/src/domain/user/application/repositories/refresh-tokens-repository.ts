import { RefreshToken } from '@domain/user/enterprise/entities/refresh-token'

export abstract class RefreshTokensRepository {
  abstract create(refreshToken: RefreshToken): Promise<void>

  abstract save(refreshToken: RefreshToken): Promise<void>

  abstract findByTokenHash(tokenHash: string): Promise<RefreshToken | null>
}
