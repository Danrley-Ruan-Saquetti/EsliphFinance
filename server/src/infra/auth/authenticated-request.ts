import { Request } from 'express'

import { AuthenticatedUser } from '@infra/auth/authenticated-user'

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}
