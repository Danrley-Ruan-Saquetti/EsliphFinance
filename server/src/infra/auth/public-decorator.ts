import { CustomDecorator, SetMetadata } from '@nestjs/common'

export const PUBLIC_ROUTE = 'public-route'

export function Public(): CustomDecorator {
  return SetMetadata(PUBLIC_ROUTE, true)
}
