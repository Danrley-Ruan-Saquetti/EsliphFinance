import { Controller, Get } from '@nestjs/common'

import { Public } from '@infra/auth/public-decorator'

@Public()
@Controller()
export class HealthController {
  @Get('/status')
  status() {
    return { status: true }
  }
}
