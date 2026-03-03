import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Resolve @/ path alias — mirrors tsconfig paths
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Override ts-jest's TypeScript config to use CJS (Jest runs in Node/CJS)
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          // Keep strict flags from the base tsconfig
          strict: true,
          noUncheckedIndexedAccess: true,
          exactOptionalPropertyTypes: true,
        },
      },
    ],
  },
  // Collect coverage from lib/utils and lib/validations only — focused scope
  collectCoverageFrom: [
    "src/lib/utils/**/*.ts",
    "src/lib/validations/**/*.ts",
    "src/lib/constants/**/*.ts",
  ],
  coverageReporters: ["text", "lcov"],
};

export default config;
