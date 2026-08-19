import { Either, left, right } from '@core/either'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { UsersRepository } from '@domain/user/application/repositories/users-repository'
import { EmailAlreadyInUseError } from '@domain/user/application/use-cases/errors/email-already-in-use-error'
import { User } from '@domain/user/enterprise/entities/user'
import { DefaultTransactionStatus } from '@domain/user/enterprise/value-objects/default-transaction-status'
import { Email } from '@domain/user/enterprise/value-objects/email'

export interface UpdateUserProfileRequest {
  userId: string
  name: string
  email: string
  defaultTransactionStatus?: DefaultTransactionStatus | null
}

export type UpdateUserProfileResponse = Either<ResourceNotFoundError | EmailAlreadyInUseError, { user: User }>

export class UpdateUserProfileUseCase implements UseCase<UpdateUserProfileRequest, UpdateUserProfileResponse> {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({ userId, name, email, defaultTransactionStatus }: UpdateUserProfileRequest): Promise<UpdateUserProfileResponse> {
    const user = await this.usersRepository.findById(userId)

    if (!user || user.isDeleted) {
      return left(new ResourceNotFoundError('Usuário não encontrado'))
    }

    const updatedEmail = Email.create(email)

    if (await this.isEmailTakenByAnotherUser(updatedEmail, userId)) {
      return left(new EmailAlreadyInUseError())
    }

    user.changeName(name)
    user.changeEmail(updatedEmail)

    if (defaultTransactionStatus !== undefined) {
      user.changeDefaultTransactionStatus(defaultTransactionStatus)
    }

    await this.usersRepository.save(user)

    return right({ user })
  }

  private async isEmailTakenByAnotherUser(email: Email, userId: string): Promise<boolean> {
    const userWithSameEmail = await this.usersRepository.findByEmail(email.value)

    if (!userWithSameEmail) {
      return false
    }

    return userWithSameEmail.id.toString() !== userId
  }
}
