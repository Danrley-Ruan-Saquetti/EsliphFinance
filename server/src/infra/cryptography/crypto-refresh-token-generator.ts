import { Injectable } from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'

import { RefreshTokenGenerator } from '@domain/user/application/services/refresh-token-generator'

@Injectable()
export class CryptoRefreshTokenGenerator extends RefreshTokenGenerator {
  static readonly TOKEN_BYTES = 32
  static readonly HASH_ALGORITHM = 'sha256'

  generate(): string {
    return randomBytes(CryptoRefreshTokenGenerator.TOKEN_BYTES).toString('base64url')
  }

  hash(token: string): string {
    return createHash(CryptoRefreshTokenGenerator.HASH_ALGORITHM).update(token).digest('hex')
  }
}
