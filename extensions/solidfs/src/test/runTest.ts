import * as path from "path";

import { runTests } from "@vscode/test-electron";
import { createApp } from "@jeswr/css-init-utils";

async function main() {
  try {
    const app = await createApp({
      port: 3_010,
      loggingLevel: "off",
      seededPodConfigJson: path.join(
        __dirname,
        "..",
        "..",
        "src",
        "test",
        "configs",
        "solid-css-seed.json"
      ),
    });

    await app.start();

    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    // Download VS Code, unzip it and run the integration test
    await runTests({ extensionDevelopmentPath, extensionTestsPath });

    await app.stop();
  } catch (err) {
    console.error("Failed to run tests");
    process.exit(1);
  }
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
