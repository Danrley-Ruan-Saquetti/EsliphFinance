import { Injectable } from '@nestjs/common'
import { compare, hash } from 'bcryptjs'

import { HashComparer } from '@domain/user/application/services/hash-comparer'
import { HashGenerator } from '@domain/user/application/services/hash-generator'

@Injectable()
export class BcryptHasher extends HashGenerator implements HashComparer {
  static readonly SALT_ROUNDS = 10

  hash(plain: string): Promise<string> {
    return hash(plain, BcryptHasher.SALT_ROUNDS)
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed)
  }
}
