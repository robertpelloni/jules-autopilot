// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@jules/shared$": "<rootDir>/packages/shared/src/index.ts",
  },
  modulePathIgnorePatterns: ["<rootDir>/external/", "<rootDir>/.next/"],
  transformIgnorePatterns: [
    "node_modules/(?!(next-auth|@auth/core)/)",
  ],
  testMatch: ["<rootDir>/app/**/*.test.ts", "<rootDir>/lib/**/*.test.ts"], // Run tests in app and lib directory
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
