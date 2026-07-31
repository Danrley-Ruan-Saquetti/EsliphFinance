import { Injectable } from '@nestjs/common'

import { AccountsRepository } from '@domain/account/application/repositories/accounts-repository'
import { Account } from '@domain/account/enterprise/entities/account'

@Injectable()
export class InMemoryAccountsRepository extends AccountsRepository {
  readonly items: Account[] = []

  create(account: Account): Promise<void> {
    this.items.push(account)

    return Promise.resolve()
  }

  findById(id: string): Promise<Account | null> {
    const account = this.items.find(item => item.id.toString() === id)

    return Promise.resolve(account ?? null)
  }
}
