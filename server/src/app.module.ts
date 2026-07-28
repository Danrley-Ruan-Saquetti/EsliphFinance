import { Module } from '@nestjs/common'

import { DatabaseModule } from '@infra/database/database.module'
import { EnvModule } from '@infra/env/env.module'
import { HttpModule } from '@infra/http/http.module'

@Module({
  imports: [EnvModule, DatabaseModule, HttpModule],
})
export class AppModule {}
