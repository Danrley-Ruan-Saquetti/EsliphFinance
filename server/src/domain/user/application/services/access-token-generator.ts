export interface AccessTokenPayload {
  sub: string
}

export abstract class AccessTokenGenerator {
  abstract generate(payload: AccessTokenPayload): Promise<string>
}
