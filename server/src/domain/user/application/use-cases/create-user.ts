import { Either, left, right } from '@core/either'
import { UseCase } from '@core/use-case'
import { UsersRepository } from '@domain/user/application/repositories/users-repository'
import { HashGenerator } from '@domain/user/application/services/hash-generator'
import { EmailAlreadyInUseError } from '@domain/user/application/use-cases/errors/email-already-in-use-error'
import { User } from '@domain/user/enterprise/entities/user'
import { Email } from '@domain/user/enterprise/value-objects/email'
import { Password } from '@domain/user/enterprise/value-objects/password'

export interface CreateUserRequest {
  name: string
  email: string
  password: string
}

export type CreateUserResponse = Either<EmailAlreadyInUseError, { user: User }>

export class CreateUserUseCase implements UseCase<CreateUserRequest, CreateUserResponse> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashGenerator: HashGenerator,
  ) {}

  async execute({ name, email, password }: CreateUserRequest): Promise<CreateUserResponse> {
    const userEmail = Email.create(email)
    const userPassword = Password.create(password)
    const userWithSameEmail = await this.usersRepository.findByEmail(userEmail.value)

    if (userWithSameEmail) {
      return left(new EmailAlreadyInUseError())
    }

    const passwordHash = await this.hashGenerator.hash(userPassword.value)
    const user = User.create({ name, email: userEmail, passwordHash })

    await this.usersRepository.create(user)

    return right({ user })
  }
}
