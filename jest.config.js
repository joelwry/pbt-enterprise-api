const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // The real `uuid` package ships ESM-only; nothing under test cares about
    // its actual output, so this swaps in a trivial CJS shim. See
    // src/testing/__mocks__/uuid.ts.
    "^uuid$": "<rootDir>/src/testing/__mocks__/uuid.ts",
  },
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  testTimeout: 20000,
  setupFiles: ["<rootDir>/src/testing/jest.env.ts"],
  // Integration tests share one real MongoDB test database (pbtDb_test) and
  // each file's afterEach truncates every collection -- running test files
  // in parallel workers would let one file's cleanup wipe another file's
  // in-progress data. Force serial execution instead of Jest's default
  // per-file worker parallelism.
  maxWorkers: 1,
};
