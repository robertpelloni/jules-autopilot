const config = {
  preset: "ts-jest/presets/default-esm",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-node",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@/(.*)$": "<rootDir>/$1",
    "^@jules/shared$": "<rootDir>/packages/shared/src/index.ts",
  },
  modulePathIgnorePatterns: ["<rootDir>/external/", "<rootDir>/.next/"],
  testMatch: ["<rootDir>/packages/shared/src/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
  },
};

export default config;
