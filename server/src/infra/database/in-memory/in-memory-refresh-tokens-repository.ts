import { Injectable } from '@nestjs/common'

import { RefreshTokensRepository } from '@domain/user/application/repositories/refresh-tokens-repository'
import { RefreshToken } from '@domain/user/enterprise/entities/refresh-token'

@Injectable()
export class InMemoryRefreshTokensRepository extends RefreshTokensRepository {
  readonly items: RefreshToken[] = []

  create(refreshToken: RefreshToken): Promise<void> {
    this.items.push(refreshToken)

    return Promise.resolve()
  }

  save(refreshToken: RefreshToken): Promise<void> {
    const index = this.items.findIndex(item => item.id.equals(refreshToken.id))

    if (index >= 0) {
      this.items[index] = refreshToken
    }

    return Promise.resolve()
  }

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return Promise.resolve(this.items.find(item => item.tokenHash === tokenHash) ?? null)
  }
}
