import { Module } from '@nestjs/common'

import { HashGenerator } from '@domain/user/application/services/hash-generator'
import { BcryptHasher } from '@infra/cryptography/bcrypt-hasher'

@Module({
  providers: [{ provide: HashGenerator, useClass: BcryptHasher }],
  exports: [HashGenerator],
})
export class CryptographyModule {}
