import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/units/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      enabled: true,
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/infra/database/drizzle/drizzle.service.ts',
        'src/infra/database/drizzle/repositories/**',
        'src/infra/database/drizzle/schemas/**',
        'src/infra/database/in-memory/**'
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85
      }
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    tsconfigPaths: true
  },
  oxc: false
})
