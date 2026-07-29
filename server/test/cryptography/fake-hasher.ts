import { HashComparer } from '@domain/user/application/services/hash-comparer'
import { HashGenerator } from '@domain/user/application/services/hash-generator'

export class FakeHasher extends HashGenerator implements HashComparer {
  static readonly SUFFIX = '-hashed'

  hash(plain: string): Promise<string> {
    return Promise.resolve(`${plain}${FakeHasher.SUFFIX}`)
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return Promise.resolve(`${plain}${FakeHasher.SUFFIX}` === hashed)
  }
}
