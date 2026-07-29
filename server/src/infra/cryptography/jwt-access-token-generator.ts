import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { AccessTokenGenerator, AccessTokenPayload } from '@domain/user/application/services/access-token-generator'
import { EnvService } from '@infra/env/env.service'

@Injectable()
export class JwtAccessTokenGenerator extends AccessTokenGenerator {
  constructor(
    private readonly jwtService: JwtService,
    private readonly envService: EnvService,
  ) {
    super()
  }

  generate(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn: this.envService.get('ACCESS_TOKEN_EXPIRES_IN_SECONDS') })
  }
}
