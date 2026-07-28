import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { EnvService } from '@infra/env/env.service'
import { validateEnv } from '@infra/env/validate-env'

@Global()
@Module({
  imports: [ConfigModule.forRoot({ validate: validateEnv })],
  providers: [EnvService],
  exports: [EnvService],
})
export class EnvModule {}
