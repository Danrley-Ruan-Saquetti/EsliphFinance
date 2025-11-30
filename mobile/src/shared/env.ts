import { z } from 'zod'

const environmentVariableSchema = z.object({
  EXPO_PUBLIC_DATABASE_NAME: z.string('Environment Variable "EXPO_PUBLIC_DATABASE_NAME" missing')
})
  .transform(variables => ({
    DATABASE_NAME: variables.EXPO_PUBLIC_DATABASE_NAME,
  }))

export type EnvironmentVariable = z.input<typeof environmentVariableSchema>

export const env = environmentVariableSchema.parse(process.env)
