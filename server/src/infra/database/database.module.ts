import { Module } from '@nestjs/common'

import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { EnvModule } from '@infra/env/env.module'

@Module({
  imports: [EnvModule],
  providers: [DrizzleService],
  exports: [DrizzleService],
})
export class DatabaseModule {}
