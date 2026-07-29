import { Injectable } from '@nestjs/common'
import { hash } from 'bcryptjs'

import { HashGenerator } from '@domain/user/application/services/hash-generator'

@Injectable()
export class BcryptHasher extends HashGenerator {
  static readonly SALT_ROUNDS = 10

  hash(plain: string): Promise<string> {
    return hash(plain, BcryptHasher.SALT_ROUNDS)
  }
}
