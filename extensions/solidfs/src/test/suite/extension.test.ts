import type { App } from "@solid/community-server";
import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';

suite("Extension Test Suite", async () => {
  let app: App;
  // const app = await createApp();

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  vscode.window.showInformationMessage("Start all tests.");

  // before(async () => {
  // app = await createApp();
  // await app.start();
  //   vscode.window.showInformationMessage("Started server");
  // }).timeout(100000);

  // afterEach(async () => {
  //   vscode.window.showInformationMessage("Stopping server");
  //   await app.stop();
  //   vscode.window.showInformationMessage("Stopped server");
  // });

  // test("abc", async () => {
  //   console.log('='.repeat(100))
  //   console.log(
  //     await vscode.commands.getCommands()
  //   )
  //   assert.strictEqual(await vscode.commands.getCommands(), [])
  // });

  test("Sample test", async () => {
    // vscode.window.showInformationMessage("Starting server...");

    // vscode.window.showInformationMessage(
    //   (await vscode.commands.getCommands()).join(',')
    // )

    // await vscode.commands.executeCommand("solidfs.open")

    // console.log('soldifs open called')

    // await new Promise((res, rej) => {
    //   setTimeout(res, 100000)
    // })

    // app = await createApp();
    // await app.start();

    vscode.window.showInformationMessage("Server started");

    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    // await new Promise((res, rej) => {
    //   setTimeout(res, 10000)
    // })
  });
});
