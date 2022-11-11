
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  extends: ["@inrupt/eslint-config-lib"],
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
  plugins: ["unused-imports"],
  rules: {
    // This is here in place until https://github.com/inrupt/typescript-sdk-tools/pull/66 is closed
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    "unused-imports/no-unused-imports": "error",
    // The convention of extensions is to *not* include vscode as a dependency
    "import/no-unresolved": ["error", { ignore: ["vscode"] }],
    // This causes errors in the vscode test suite which does not contain any exports
    "import/prefer-default-export": "off",
    // We use mocha (not jest) for vscode extensions
    "jest/expect-expect": "off",
    // Empty constructors are used frequently to assign variables without doing other operations
    "no-useless-constructor": "off"
  },
}
