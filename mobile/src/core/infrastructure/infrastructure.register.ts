import { DependencyRegister, Scope } from '@esliph/injection'

import { db } from '@core/infrastructure/database/database'

const dependencies: DependencyRegister[] = [
  {
    token: 'DB',
    scope: Scope.SINGLETON,
    useValue: db,
  }
]

export default dependencies
