import { AccessTokenPayload } from '@domain/user/application/services/access-token-generator'

export abstract class AccessTokenVerifier {
  abstract verify(token: string): Promise<AccessTokenPayload | null>
}
