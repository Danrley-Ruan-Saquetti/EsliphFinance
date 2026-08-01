import { INestApplication } from '@nestjs/common'
import { getTableName, isTable, sql } from 'drizzle-orm'

import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import * as schemas from '@infra/database/drizzle/schemas'

export async function cleanDatabase(app: INestApplication): Promise<void> {
  const tableNames = Object.values<unknown>(schemas)
    .filter(isTable)
    .map(table => `"${getTableName(table)}"`)

  await app.get(DrizzleService).db.execute(sql.raw(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`))
}
