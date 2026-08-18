import { Either, left, right } from '@core/either'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { AccountsRepository } from '@domain/account/application/repositories/accounts-repository'
import { Account } from '@domain/account/enterprise/entities/account'

export interface ArchiveAccountRequest {
  accountId: string
  ownerId: string
}

export type ArchiveAccountResponse = Either<ResourceNotFoundError, { account: Account }>

export class ArchiveAccountUseCase implements UseCase<ArchiveAccountRequest, ArchiveAccountResponse> {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  async execute({ accountId, ownerId }: ArchiveAccountRequest): Promise<ArchiveAccountResponse> {
    const account = await this.accountsRepository.findById(accountId)

    if (!account || account.ownerId.toString() !== ownerId) {
      return left(new ResourceNotFoundError('Conta não encontrada'))
    }

    account.archive()

    await this.accountsRepository.save(account)

    return right({ account })
  }
}
