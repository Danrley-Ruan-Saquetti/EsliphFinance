import { AccessTokenPayload } from '@domain/user/application/services/access-token-generator'
import { AccessTokenVerifier } from '@domain/user/application/services/access-token-verifier'
import { FakeAccessTokenGenerator } from '@tests/cryptography/fake-access-token-generator'

export class FakeAccessTokenVerifier extends AccessTokenVerifier {
  verify(token: string): Promise<AccessTokenPayload | null> {
    if (!token.startsWith(FakeAccessTokenGenerator.PREFIX)) {
      return Promise.resolve(null)
    }

    return Promise.resolve({ sub: token.slice(FakeAccessTokenGenerator.PREFIX.length) })
  }
}
