import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'

import { JwtAuthGuard } from '@infra/auth/jwt-auth-guard'
import { CryptographyModule } from '@infra/cryptography/cryptography.module'

@Module({
  imports: [CryptographyModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
