import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/_prototype_backup/', '<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/tests/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/test-utils/**',
    // Next route handlers are mostly integration-tested; excluding them avoids skewing the global *function* ratio (many 1-export files).
    '!src/app/api/**/*.ts',
    'src/app/api/demo/client-audio/**/*.ts',
    '!src/app/layout.tsx',
    '!src/app/page.tsx',
    '!src/app/technician/page.tsx',
    '!src/features/technicians/components/**',
  ],
  coverageThreshold: {
    global: {
      statements: 4,
      branches: 20,
      functions: 7,
      lines: 4,
    },
    // Modules métier P0 (fichiers ciblés — pas le dossier entier, trop de composants UI non couverts).
    './src/features/interventions/assignInterventionToTechnician.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    './src/features/interventions/technicianAssignmentActions.ts': {
      statements: 90,
      branches: 70,
      functions: 100,
      lines: 90,
    },
    './src/features/interventions/technicianSchedule.ts': {
      statements: 48,
      branches: 60,
      functions: 50,
      lines: 48,
    },
    './src/core/ui/dashboardDesktopLayout.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
