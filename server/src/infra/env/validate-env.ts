import { ZodError } from 'zod'

import { Env, envSchema } from '@infra/env/env'

type EnvIssue = ZodError['issues'][number]

export function validateEnv(environment: Record<string, unknown>): Env {
  const result = envSchema.safeParse(environment)

  if (result.success) {
    return result.data
  }

  throw new Error(describeInvalidEnvironment(result.error, environment))
}

function describeInvalidEnvironment(error: ZodError, environment: Record<string, unknown>): string {
  const descriptions = error.issues.map(issue => `  - ${describeIssue(issue, environment)}`)

  return ['Invalid environment variables:', ...descriptions].join('\n')
}

function describeIssue(issue: EnvIssue, environment: Record<string, unknown>): string {
  const variable = issue.path.join('.')

  if (issue.code === 'invalid_type' && environment[variable] === undefined) {
    return `${variable} is required`
  }

  return `${variable}: ${issue.message}`
}
