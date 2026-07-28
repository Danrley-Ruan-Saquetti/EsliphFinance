import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { Env, envSchema } from '@infra/env/env'
import { EnvService } from '@infra/env/env.service'

@Global()
@Module({
  imports: [ConfigModule.forRoot({ validate: (env): Env => envSchema.parse(env) })],
  providers: [EnvService],
  exports: [EnvService],
})
export class EnvModule {}
