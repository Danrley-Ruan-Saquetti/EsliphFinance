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
}
