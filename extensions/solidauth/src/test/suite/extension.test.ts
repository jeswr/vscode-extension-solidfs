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
import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { ActivityBar, ActionsControl } from 'vscode-extension-tester';
// import * as myExtension from '../../extension';

suite("Extension Test Suite", () => {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  vscode.window.showInformationMessage("Start all tests.");

  // await new Promise(res => setTimeout(res, 3000));

  // const login = await vscode.commands.executeCommand("solidauth.login")

  // await new Promise(res => setTimeout(res, 3000));

  // vscode.window.showInformationMessage("Finish all tests.");



  // test("Log in", async () => {
  // const session = await vscode.authentication.getSession(
  //   'solidauth',
  //   [],
  //   { createIfNone: true }
  // );
  // });

  test("Sample test", async function () {
    this.timeout(10000)
    // vscode.window.c
    // const login = await vscode.commands.executeCommand("solidauth.login")
    await new Promise(res => setTimeout(res, 1000));

    // @ts-ignore
    // vscode.window.showQuickPick = (...args: any[]) => Promise.resolve('http://localhost:3000/')

    delete vscode.window.showQuickPick;
    // @ts-ignore
    delete vscode.window.showOpenDialog;
    // @ts-ignore
    delete vscode.window.showInputBox;


    // @ts-ignore
    vscode.window = {
      // createOutputChannel: vscode.window.createOutputChannel,
      // withProgress: vscode.window.withProgress,
      // @ts-ignore
      withProgress: (_, f) => f(),
      createOutputChannel: () => {},
    }

    const session = await vscode.authentication.getSession(
      'solidauth',
      [],
      { createIfNone: true }
    );

    // await new Promise(res => setTimeout(res, 1000));
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    vscode.window.showInformationMessage("Finish all tests.");
    await new Promise(res => setTimeout(res, 1000));
  });
});
