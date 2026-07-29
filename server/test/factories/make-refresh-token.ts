import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { RefreshToken, RefreshTokenProps } from '@domain/user/enterprise/entities/refresh-token'

const THIRTY_DAYS_IN_MILLISECONDS = 2592000000

export function makeRefreshToken(override: Partial<RefreshTokenProps> = {}, id?: UniqueEntityID): RefreshToken {
  return RefreshToken.create(
    {
      userId: new UniqueEntityID(),
      tokenHash: 'hash-do-token-de-renovação',
      expiresAt: new Date(Date.now() + THIRTY_DAYS_IN_MILLISECONDS),
      ...override,
    },
    id,
  )
}
