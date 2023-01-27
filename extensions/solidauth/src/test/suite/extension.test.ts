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
import { SolidAuthenticationProvider } from '../../auth/solidAuthenticationProvider';
// import * as myExtension from '../../extension';
import { cssRedirectFactory } from '@jeswr/css-auth-utils';
import puppeteer from 'puppeteer';
import open = require('open');

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
    this.timeout(20000)
    // vscode.window.c
    // const login = await vscode.commands.executeCommand("solidauth.login")
    // await new Promise(res => setTimeout(res, 1000));

    // @ts-ignore
    // vscode.window.showQuickPick = (...args: any[]) => Promise.resolve('http://localhost:3000/')

    // delete vscode.window.showQuickPick;
    // @ts-ignore
    // delete vscode.window.showOpenDialog;
    // @ts-ignore
    // delete vscode.window.showInputBox;
    
    // @ts-ignore
    // vscode.window = new Proxy(vscode.window, {

    // })

    const progress: vscode.Progress<{
      message?: string | undefined;
      increment?: number | undefined;
  }> = {
    report() {}
  }
  


    // @ts-ignore
    vscode.window = {
      // createOutputChannel: vscode.window.createOutputChannel,
      // withProgress: vscode.window.withProgress,
      // @ts-ignore
      withProgress: (_, f) => f({ report() {} }, { isCancellationRequested: false }),
      createOutputChannel: () => {},
      showInformationMessage: () => {},
      showQuickPick: () => Promise.resolve('http://localhost:3010/'),
    }

    const openExternal = vscode.env.openExternal

    // @ts-ignore
    vscode.env.openExternal = async (url: vscode.Uri) => {
  //     console.log(`query [${url.query}]`)
  //   console.log(`externally opening [${url.toString(true)}]`)
  //   await open(url.toString(true))
  //   await new Promise((resolve) => {});
  //   return;

  //  // Visit the redirect url
  //  const browser = await puppeteer.launch({ headless: false });
  //  const page = await browser.newPage();
  //  await page.goto(`${url}`);

  //  // Block at this step

  //  await new Promise((resolve) => {});
  //  return;

  //  // Fill out the username / password form
  //  await page.type('input[id=email]', "hello@example.com");
  //  await page.type('input[name=password]', 'abc123');
  //  await page.click('button[type=submit]');

  //  // Navigate to the authorise page
  //  await page.waitForNavigation();

  //  // Click the authorise button
  //  await page.click('button[type=submit]');

  //  // Navigate to the authorise page
  //  await page.waitForNavigation();

  //  // Close the page and browser
  //  await page.close();
  //  await browser.close();


      console.log(`Opening [${url}]`)
      await cssRedirectFactory("hello@example.com", 'abc123')(url.toString(true));
      console.log('flow complete')
      // console.log('open external', url)
    }

    console.log('pre get session')

    const secretData: Record<string, string> = {};

    const authProvider = new SolidAuthenticationProvider({
      secrets: {
        get: async (key: string) => secretData[key],
        store: async (key: string, value: string) => {
          // console.log(key, value)
          try {
            // console.log(JSON.parse(value))
          } catch {
            
          }
          secretData[key] = value;
        },
        delete:  async (key: string) => delete secretData[key],
    },
      extension: { packageJSON: { name: 'VSCode Mock' } },
    } as any);

    const sessions = await authProvider.getSessions();

    assert.deepEqual(sessions, []);

    const newSession = await authProvider.createSession([]);

    console.log(newSession)

    // const session = await vscode.authentication.getSession(
    //   'solidauth',
    //   [],
    //   { createIfNone: true }
    // );

    // await new Promise(res => setTimeout(res, 1000));
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    vscode.window.showInformationMessage("Finish all tests.");
    await new Promise(res => setTimeout(res, 1000));
  });
});
