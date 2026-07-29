import { randomUUID } from 'node:crypto'

import { RefreshTokenGenerator } from '@domain/user/application/services/refresh-token-generator'

export class FakeRefreshTokenGenerator extends RefreshTokenGenerator {
  static readonly HASH_SUFFIX = '-hashed'

  generate(): string {
    return randomUUID()
  }

  hash(token: string): string {
    return `${token}${FakeRefreshTokenGenerator.HASH_SUFFIX}`
  }
}
