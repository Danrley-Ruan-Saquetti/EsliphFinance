import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { z } from 'zod'

import { AccessTokenPayload } from '@domain/user/application/services/access-token-generator'
import { AccessTokenVerifier } from '@domain/user/application/services/access-token-verifier'

const accessTokenPayloadSchema = z.object({ sub: z.uuid() })

@Injectable()
export class JwtAccessTokenVerifier extends AccessTokenVerifier {
  constructor(private readonly jwtService: JwtService) {
    super()
  }

  async verify(token: string): Promise<AccessTokenPayload | null> {
    const payload = await this.decode(token)
    const result = accessTokenPayloadSchema.safeParse(payload)

    if (!result.success) {
      return null
    }

    return result.data
  }

  private async decode(token: string): Promise<unknown> {
    try {
      return await this.jwtService.verifyAsync<object>(token)
    } catch {
      return null
    }
  }
}
