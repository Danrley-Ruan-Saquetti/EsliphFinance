import { AccessTokenGenerator, AccessTokenPayload } from '@domain/user/application/services/access-token-generator'

export class FakeAccessTokenGenerator extends AccessTokenGenerator {
  static readonly PREFIX = 'access-token-of-'

  generate(payload: AccessTokenPayload): Promise<string> {
    return Promise.resolve(`${FakeAccessTokenGenerator.PREFIX}${payload.sub}`)
  }
}
