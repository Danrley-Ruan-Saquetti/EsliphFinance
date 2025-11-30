import CoreDependencies from '@core/core.register'

import { container } from '@shared/container-injection'

container.register([
  ...CoreDependencies
])
