import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AccessTokenGenerator } from '@domain/user/application/services/access-token-generator'
import { HashComparer } from '@domain/user/application/services/hash-comparer'
import { HashGenerator } from '@domain/user/application/services/hash-generator'
import { RefreshTokenGenerator } from '@domain/user/application/services/refresh-token-generator'
import { BcryptHasher } from '@infra/cryptography/bcrypt-hasher'
import { CryptoRefreshTokenGenerator } from '@infra/cryptography/crypto-refresh-token-generator'
import { JwtAccessTokenGenerator } from '@infra/cryptography/jwt-access-token-generator'
import { EnvModule } from '@infra/env/env.module'
import { EnvService } from '@infra/env/env.service'

@Module({
  imports: [
    EnvModule,
    JwtModule.registerAsync({
      imports: [EnvModule],
      inject: [EnvService],
      useFactory: (envService: EnvService) => ({ secret: envService.get('JWT_SECRET'), signOptions: { algorithm: 'HS256' } }),
    }),
  ],
  providers: [
    BcryptHasher,
    { provide: HashGenerator, useExisting: BcryptHasher },
    { provide: HashComparer, useExisting: BcryptHasher },
    { provide: AccessTokenGenerator, useClass: JwtAccessTokenGenerator },
    { provide: RefreshTokenGenerator, useClass: CryptoRefreshTokenGenerator },
  ],
  exports: [HashGenerator, HashComparer, AccessTokenGenerator, RefreshTokenGenerator],
})
export class CryptographyModule {}
