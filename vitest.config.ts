import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const resolvePath = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Core logic only — UI components are exercised via component tests
      // but the ≥90% bar applies to calculations, services and schemas.
      include: [
        'shared/**/*.ts',
        'server/src/services/**/*.ts',
        'server/src/schemas/**/*.ts',
        'client/src/lib/**/*.ts',
      ],
      exclude: ['**/*.test.*', '**/types.ts'],
      thresholds: { lines: 90, functions: 90, statements: 90 },
    },
    projects: [
      {
        test: {
          name: 'server',
          environment: 'node',
          include: ['shared/**/*.test.ts', 'server/**/*.test.ts', 'tests/**/*.test.ts'],
        },
      },
      {
        resolve: { alias: { '@shared': resolvePath('./shared') } },
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['client/src/**/*.test.{ts,tsx}'],
          setupFiles: [resolvePath('./client/src/test/setup.ts')],
        },
      },
    ],
  },
});
