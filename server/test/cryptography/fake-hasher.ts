import { HashGenerator } from '@domain/user/application/services/hash-generator'

export class FakeHasher extends HashGenerator {
  static readonly SUFFIX = '-hashed'

  hash(plain: string): Promise<string> {
    return Promise.resolve(`${plain}${FakeHasher.SUFFIX}`)
  }
}
