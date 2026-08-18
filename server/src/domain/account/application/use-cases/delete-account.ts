import { Either, left, right } from '@core/either'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { AccountsRepository } from '@domain/account/application/repositories/accounts-repository'

export interface DeleteAccountRequest {
  accountId: string
  ownerId: string
}

export type DeleteAccountResponse = Either<ResourceNotFoundError, null>

export class DeleteAccountUseCase implements UseCase<DeleteAccountRequest, DeleteAccountResponse> {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  async execute({ accountId, ownerId }: DeleteAccountRequest): Promise<DeleteAccountResponse> {
    const account = await this.accountsRepository.findById(accountId)

    if (!account || account.ownerId.toString() !== ownerId) {
      return left(new ResourceNotFoundError('Conta não encontrada'))
    }

    await this.accountsRepository.delete(accountId)

    return right(null)
  }
}
