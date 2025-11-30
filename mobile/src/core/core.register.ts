import { DependencyRegister } from '@esliph/injection'

import InfrastructureDependencies from '@core/infrastructure/infrastructure.register'

const dependencies: DependencyRegister[] = [
  ...InfrastructureDependencies
]

export default dependencies
