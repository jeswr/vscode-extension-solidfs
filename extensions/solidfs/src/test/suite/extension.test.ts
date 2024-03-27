//
// Copyright 2022 Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
import { App } from "@solid/community-server";
import * as assert from "assert";
import { afterEach, before } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { createApp } from '../serverSetup';
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
