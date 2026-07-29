import { Either, left, right } from '@core/either'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { UseCase } from '@core/use-case'
import { RefreshTokensRepository } from '@domain/user/application/repositories/refresh-tokens-repository'
import { UsersRepository } from '@domain/user/application/repositories/users-repository'
import { AccessTokenGenerator } from '@domain/user/application/services/access-token-generator'
import { HashComparer } from '@domain/user/application/services/hash-comparer'
import { RefreshTokenGenerator } from '@domain/user/application/services/refresh-token-generator'
import { InvalidCredentialsError } from '@domain/user/application/use-cases/errors/invalid-credentials-error'
import { RefreshToken } from '@domain/user/enterprise/entities/refresh-token'
import { Email } from '@domain/user/enterprise/value-objects/email'

const MILLISECONDS_IN_SECOND = 1000

export interface AuthenticateUserRequest {
  email: string
  password: string
}

export interface AuthenticatedSession {
  accessToken: string
  refreshToken: string
}

export type AuthenticateUserResponse = Either<InvalidCredentialsError, AuthenticatedSession>

export class AuthenticateUserUseCase implements UseCase<AuthenticateUserRequest, AuthenticateUserResponse> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly hashComparer: HashComparer,
    private readonly accessTokenGenerator: AccessTokenGenerator,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly refreshTokenExpiresInSeconds: number,
  ) {}

  async execute({ email, password }: AuthenticateUserRequest): Promise<AuthenticateUserResponse> {
    const user = await this.usersRepository.findByEmail(Email.normalize(email))

    if (!user) {
      return left(new InvalidCredentialsError())
    }

    const isPasswordValid = await this.hashComparer.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      return left(new InvalidCredentialsError())
    }

    const accessToken = await this.accessTokenGenerator.generate({ sub: user.id.toString() })
    const refreshToken = await this.issueRefreshToken(user.id)

    return right({ accessToken, refreshToken })
  }

  private async issueRefreshToken(userId: UniqueEntityID): Promise<string> {
    const token = this.refreshTokenGenerator.generate()
    const refreshToken = RefreshToken.create({ userId, tokenHash: this.refreshTokenGenerator.hash(token), expiresAt: this.expirationFromNow() })

    await this.refreshTokensRepository.create(refreshToken)

    return token
  }

  private expirationFromNow(): Date {
    return new Date(Date.now() + this.refreshTokenExpiresInSeconds * MILLISECONDS_IN_SECOND)
  }
}
