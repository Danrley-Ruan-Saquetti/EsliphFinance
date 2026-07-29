import { RefreshToken } from '@domain/user/enterprise/entities/refresh-token'

export abstract class RefreshTokensRepository {
  abstract create(refreshToken: RefreshToken): Promise<void>
}
