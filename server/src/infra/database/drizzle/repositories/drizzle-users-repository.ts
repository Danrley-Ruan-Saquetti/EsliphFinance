import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import { UsersRepository } from '@domain/user/application/repositories/users-repository'
import { User } from '@domain/user/enterprise/entities/user'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { DrizzleUserMapper } from '@infra/database/drizzle/mappers/drizzle-user-mapper'
import { users } from '@infra/database/drizzle/schemas/users'

@Injectable()
export class DrizzleUsersRepository extends UsersRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super()
  }

  async create(user: User): Promise<void> {
    await this.drizzle.db.insert(users).values(DrizzleUserMapper.toPersistence(user))
  }

  async findByEmail(email: string): Promise<User | null> {
    const [record] = await this.drizzle.db.select().from(users).where(eq(users.email, email)).limit(1)

    if (!record) {
      return null
    }

    return DrizzleUserMapper.toDomain(record)
  }
}
