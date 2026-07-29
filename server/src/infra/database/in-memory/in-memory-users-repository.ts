import { Injectable } from '@nestjs/common'

import { UsersRepository } from '@domain/user/application/repositories/users-repository'
import { User } from '@domain/user/enterprise/entities/user'

@Injectable()
export class InMemoryUsersRepository extends UsersRepository {
  readonly items: User[] = []

  create(user: User): Promise<void> {
    this.items.push(user)

    return Promise.resolve()
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(this.items.find(item => item.email.value === email) ?? null)
  }
}
