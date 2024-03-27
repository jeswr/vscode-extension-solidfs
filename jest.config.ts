
import type { Config } from "jest";

type ArrayElement<MyArray> = MyArray extends Array<infer T> ? T : never;

const baseConfig: ArrayElement<NonNullable<Config["projects"]>> = {
  roots: ["<rootDir>"],
  testMatch: ["**/*.spec.ts"],
  // This combination of preset/transformIgnorePatterns enforces that both TS and
  // JS files are transformed to CJS, and that the transform also applies to the
  // dependencies in the node_modules, so that ESM-only dependencies are supported.
  preset: "ts-jest/presets/js-with-ts",
  // deliberately set to an empty array to allow including node_modules when transforming code:
  transformIgnorePatterns: [],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/examples/"],
  coveragePathIgnorePatterns: [".*.spec.ts", "dist/"],
  clearMocks: true,
  injectGlobals: false,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

// Required by @peculiar/webcrypto, which comes from the polyfills
// loaded in the setup file.
process.env.OPENSSL_CONF = "/dev/null";

export default {
  reporters: ["default", "github-actions"],
  collectCoverage: true,
  coverageReporters: process.env.CI ? ["text", "lcov"] : ["text"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  collectCoverageFrom: ["<rootDir>/lib/**/*.ts"],
  projects: [
    {
      ...baseConfig,
      displayName: "solid-vscode-auth",
      roots: ["<rootDir>/packages/solid-vscode-auth"],
    }
  ],
} as Config;