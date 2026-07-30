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

  save(user: User): Promise<void> {
    const index = this.items.findIndex(item => item.id.equals(user.id))

    if (index >= 0) {
      this.items[index] = user
    }

    return Promise.resolve()
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.items.find(item => item.id.toString() === id) ?? null)
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(this.items.find(item => item.email.value === email) ?? null)
  }
}
