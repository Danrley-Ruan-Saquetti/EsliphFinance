import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common'
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from '@infra/database/drizzle/schemas'
import { EnvService } from '@infra/env/env.service'

@Injectable()
export class DrizzleService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DrizzleService.name)
  private readonly pool: Pool
  readonly db: NodePgDatabase<typeof schema>

  constructor(envService: EnvService) {
    this.pool = new Pool({
      connectionString: envService.get('DATABASE_URL'),
      max: envService.get('DATABASE_POOL_MAX'),
      ssl: envService.get('DATABASE_SSL') ? { rejectUnauthorized: true } : false,
    })

    this.db = drizzle(this.pool, { schema })
  }

  async onModuleInit(): Promise<void> {
    const connection = await this.pool.connect()

    connection.release()

    this.logger.log('Database connection established')
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end()

    this.logger.log('Database connection closed')
  }
}
