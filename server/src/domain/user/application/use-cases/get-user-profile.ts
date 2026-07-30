import { Either, left, right } from '@core/either'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { UsersRepository } from '@domain/user/application/repositories/users-repository'
import { User } from '@domain/user/enterprise/entities/user'

export interface GetUserProfileRequest {
  userId: string
}

export type GetUserProfileResponse = Either<ResourceNotFoundError, { user: User }>

export class GetUserProfileUseCase implements UseCase<GetUserProfileRequest, GetUserProfileResponse> {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({ userId }: GetUserProfileRequest): Promise<GetUserProfileResponse> {
    const user = await this.usersRepository.findById(userId)

    if (!user || user.isDeleted) {
      return left(new ResourceNotFoundError('Usuário não encontrado'))
    }

    return right({ user })
  }
}
