import { defineConfig } from 'vitest/config'
import path from 'path'

const alias = { '@': path.resolve(__dirname, './src') }

const sharedTest = {
  environment: 'node' as const,
  globals: true,
  setupFiles: ['./src/test/vitest.setup.ts'],
}

export default defineConfig({
  test: {
    ...sharedTest,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/actions/**', 'src/lib/**'],
      exclude: ['src/test/**'],
    },
    projects: [
      {
        test: {
          ...sharedTest,
          name: 'unit',
          include: ['src/lib/__tests__/**/*.test.ts'],
        },
        resolve: { alias },
      },
      {
        test: {
          ...sharedTest,
          name: 'integration',
          include: ['src/actions/__tests__/**/*.test.ts'],
          testTimeout: 30_000,
          hookTimeout: 30_000,
          fileParallelism: false,
          env: {
            NODE_ENV: 'test',
            TEST_DATABASE_URL: 'postgresql://testuser:testpass@127.0.0.1:5432/ops360_test'
          }
        },
        resolve: { alias },
      },
    ],
  },
  resolve: { alias },
})
