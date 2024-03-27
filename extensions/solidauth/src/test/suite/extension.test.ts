import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { cssRedirectFactory } from "@jeswr/css-auth-utils";
import { buildAuthenticatedFetchFromAccessToken } from "@jeswr/solid-vscode-auth";
import { makeDirectory } from "solid-bashlib";
import { getPodRoot } from "solid-bashlib/dist/utils/util";
import { v4 } from "uuid";
import express = require("express");
import type { Express } from "express";
import { essRedirectFactory } from "./essRedirectFactory";
import { SolidAuthenticationProvider } from "../../auth/solidAuthenticationProvider";

function mockWindow(quickPick: string): typeof vscode.window {
  return {
    ...vscode.window,
    withProgress: (_: any, f: any) =>
      f({ report() {} }, { isCancellationRequested: false }),
    createOutputChannel: () => {},
    showInformationMessage: () => {},
    showQuickPick: () => Promise.resolve(quickPick),
  } as any;
}

function createAuthenticationProvider(secretData: Record<string, string>) {
  return new SolidAuthenticationProvider({
    secrets: {
      get: async (key: string) => secretData[key],
      store: async (key: string, value: string) => (secretData[key] = value),
      delete: async (key: string) => delete secretData[key],
    },
    extension: { packageJSON: { name: "VSCode Mock" }, id: "jeswr.solidauth" },
  } as any);
}

// export function essRedirectFactory(email: string, password: string) {
//   const params = {
//     email: 'input[id=signInFormUsername]',
//     password: 'input[id=signInFormPassword]',
//     submit: 'input[type=Submit]',
//     approve: 'button[form=approve]',
//   }

//   return async function handleRedirect(url: string) {
//     const u = new URL(url);

//     console.log(`[${url}]`)

//     if (url.includes('redirect_uri=vscode:')) {
//       u.searchParams.delete('redirect_uri');
//       url = `${u.toString()}&redirect_uri=http://localhost:3125/redirect`
//     }

//     console.log(`[${url}] [${u.toString()}]`)

//     return _essRedirectFactory(email, password)(url);

//     // Visit the redirect url
//     const browser = await puppeteer.launch({ headless: false });

//     // const settings =

//     // browser.on('d')

//     const page = await browser.newPage();

//     //   await page.setRequestInterception(true);

//     //   page.on('request', (request) => {
//     //     console.log('-'.repeat(100), 'request called', request.url())
//     //     if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
//     //         request.abort();
//     //     } else {
//     //         request.continue();
//     //     }
//     // });

//     // browser.on('')
//     page.on('response', e => { console.log(e.url()) })
//     page.on('request', e => { console.log('request', e.url()); e.continue() })

//     // await page.setViewport({ width: 1920, height: 1080 });

//     // console.log('browser targets at start', browser.targets())

//     // page.on('dialog', d => { console.log('dialog', d) });
//     // page.on('popup', d => { console.log('popup', d) });
//     // page.on('load', d => { console.log('load', d) });
//     // page.on('load', d => { console.log('load', d) });

//     await page.goto(url);

//     // Fill out the username / password form
//     await page.type(params.email, email);
//     await page.type(params.password, password);
//     await page.click(params.submit);

//     console.log('a')

//     // Submit and navigate to the authorise page
//     await page.waitForNavigation();

//     console.log('b')

//     // const events = [
//     //   "close",
//     //   "console",
//     //   "dialog",
//     //   "domcontentloaded",
//     //   "error",
//     //   "frameattached",
//     //   "framedetached",
//     //   "framenavigated",
//     //   "load",
//     //   "metrics",
//     //   "pageerror",
//     //   "popup",
//     //   "request",
//     //   "response",
//     //   "requestfailed",
//     //   "requestfinished",
//     //   "requestservedfromcache",
//     //   "workercreated",
//     //   "workerdestroyed",
//     //   ]

//     //   for (const event of events) {
//     //     // @ts-ignore
//     //     browser.on(event, d => { console.log(event, d) })
//     //   }

//     await page.click(params.approve ?? params.submit);

//     // await new Promise(res => setTimeout(res, 60_000));

//     try {
//       // eslint-disable-next-line no-await-in-loop
//       await page.waitForNavigation({ timeout: 500 });
//     } catch {
//       // 3 tabs in firefox, 1 tab in chrome
//       // console.log('f')
//       // await new Promise(res => setTimeout(res, 1000));
//       // page.keyboard.press('Tab').catch(() => { console.log('caught on tab 1') });
//       // console.log('fg')
//       // await new Promise(res => setTimeout(res, 1000));
//       // page.keyboard.press('Tab').catch(() => { console.log('caught on tab 2') });
//       // console.log('fg1')
//       await new Promise(res => setTimeout(res, 1000));
//       page.keyboard.press('Tab').catch(() => { console.log('caught on tab 3') });
//       console.log('fh')
//       await new Promise(res => setTimeout(res, 1000));
//       page.keyboard.press('Enter').catch(() => { console.log('caught on enter') });
//       // eslint-disable-next-line no-await-in-loop
//       console.log('fh1')
//       await new Promise(res => setTimeout(res, 10_000));
//       await page.waitForNavigation({ timeout: 5_000 }).catch(() => { });
//       console.log('attempted to wait for navigation')
//       await new Promise(res => setTimeout(res, 100_000));
//     }

//     try {
//       // Close the page and browser
//       await page.close();
//       await browser.close();
//     } catch {
//       // Suppress close error
//     }
//   };
// }

suite("Extension Test Suite", () => {
  [
    {
      name: "CSS",
      oidcIssuer: "http://localhost:3010/",
      redirectFactory: cssRedirectFactory("hello@example.com", "abc123"),
      label: "example",
      id: "http://localhost:3010/example/profile/card#me",
    },
    {
      name: "ESS",
      oidcIssuer: "https://login.inrupt.com",
      redirectFactory: essRedirectFactory("jeswrTest51", "jeswrTest51"),
      label: "Jesse Wright 🐨",
      id: "https://id.inrupt.com/jeswrtest51",
    },
  ].forEach((data) => {
    suite(`${data.name} suite`, async function () {
      const secretData: Record<string, string> = {};
      let authProvider: SolidAuthenticationProvider;
      let openExternalCount = 0;
      let windowTemp: typeof vscode.window;
      let envTemp: typeof vscode.env;
      let app: Express;

      // Mock some vscode APIs
      this.beforeAll(() => {
        // // @ts-ignore
        // vscode.window.withProgress = (_: any, f: any) => f({ report() { } }, { isCancellationRequested: false });
        // // @ts-ignore
        // vscode.window.createOutputChannel = () => { };
        // // @ts-ignore
        // vscode.window.showInformationMessage = () => { };
        // // @ts-ignore
        // vscode.window.showQuickPick = () => { };
        // @ts-ignore
        vscode.window = {
          ...vscode.window,
          withProgress: (_: any, f: any) =>
            f({ report() {} }, { isCancellationRequested: false }),
          createOutputChannel: () => {},
          showInformationMessage: () => {},
          showQuickPick: () => Promise.resolve(data.oidcIssuer),
        };

        const handlers: vscode.UriHandler[] = [];

        // @ts-ignore
        vscode.env.openExternal = (url: vscode.Uri) => {
          openExternalCount += 1;
          data.redirectFactory(url.toString(true)).then((res) => {
            // Mocking redirects back to the vscode URI
            if (typeof res === "string") {
              for (const handler of handlers) {
                handler.handleUri(vscode.Uri.parse(res));
              }
            }
          });
          return true;
        };

        // @ts-ignore
        vscode.window.registerUriHandler = function (
          handler: vscode.UriHandler
        ) {
          handlers.push(handler);
          return {
            dispose() {
              handlers.filter((h) => h !== handler);
            },
          };
        };

        windowTemp = vscode.window;
        envTemp = vscode.env;
      });

      // Recover the vscode APIs
      // this.afterAll(() => {
      //   // @ts-ignore
      //   vscode.window = windowTemp;
      //   // @ts-ignore
      //   vscode.env = envTemp;
      // });

      function create() {
        authProvider = createAuthenticationProvider(secretData);
        assert.deepEqual(typeof authProvider, "object");
      }

      function testSessionsDetails(
        sessions: readonly vscode.AuthenticationSession[]
      ) {
        assert.deepEqual(sessions.length, 1);
        assert.deepEqual(sessions[0].account, {
          label: data.label,
          id: data.id,
        });
      }

      function testSessionDetails(info: string) {
        test(`[${info}] no scope should have one session`, async function () {
          this.timeout(10_000);
          testSessionsDetails(await authProvider.getSessions());
        });

        test(`[${info}] empty scope should have one session`, async function () {
          this.timeout(10_000);
          testSessionsDetails(await authProvider.getSessions([]));
        });

        test(`[${info}] correct webId scope should have one session`, async function () {
          this.timeout(20_000);
          testSessionsDetails(
            await authProvider.getSessions([`webId:${data.id}`])
          );
        });

        test(`[${info}] incorrect webId scope should have no session`, async function () {
          assert.deepEqual(
            (
              await authProvider.getSessions([
                `webId:http://example.org/nonWebId`,
              ])
            ).length,
            0
          );
        });

        test(`[${info}] correct oidcIssuer scope should have one session`, async function () {
          this.timeout(20_000);
          testSessionsDetails(
            await authProvider.getSessions([`oidcIssuer:${data.oidcIssuer}`])
          );
        });

        test(`[${info}] incorrect oidcIssuer scope should have no session`, async function () {
          assert.deepEqual(
            (
              await authProvider.getSessions([
                `oidcIssuer:http://example.org/nonOidcIssuer`,
              ])
            ).length,
            0
          );
        });

        test(`[${info}] correct webId and oidcProvider scope should have one session`, async function () {
          this.timeout(20_000);
          testSessionsDetails(
            await authProvider.getSessions([
              `webId:${data.id}`,
              `oidcIssuer:${data.oidcIssuer}`,
            ])
          );
        });

        test(`[${info}] correct webId and incorrect oidcProvider scope should have no session`, async function () {
          assert.deepEqual(
            (
              await authProvider.getSessions([
                `webId:${data.id}`,
                `oidcIssuer:http://example.org/nonOidcIssuer`,
              ])
            ).length,
            0
          );
        });

        test(`[${info}] incorrect webId and correct oidcProvider scope should have no session`, async function () {
          assert.deepEqual(
            (
              await authProvider.getSessions([
                `webId:http://example.org/nonWebId`,
                `oidcIssuer:${data.oidcIssuer}`,
              ])
            ).length,
            0
          );
        });
      }

      async function buildAuthenticatedFetchTest() {
        // @ts-ignore
        this.timeout(120_000);

        const [{ account, accessToken }] = await authProvider.getSessions();

        const fetch = await buildAuthenticatedFetchFromAccessToken(accessToken);
        assert.deepEqual(typeof fetch, "function");

        const newContainer = `${await getPodRoot(account.id, fetch)}${v4()}/`;
        await makeDirectory(newContainer, { fetch });
        assert.deepEqual((await fetch(newContainer)).status, 200);
      }

      async function testDisposal() {
        assert.deepEqual(await authProvider.dispose(), undefined);
      }

      async function emptySessions() {
        assert.deepEqual(await authProvider.getSessions(), []);
      }

      test("Create first authentication provider on empty secret data", create);

      test(
        "#getSessions should return an empty array before any logins",
        emptySessions
      );

      test("#createSession should trigger login and create an account", async function () {
        this.timeout(120_000);

        assert.deepEqual((await authProvider.createSession([])).account, {
          label: data.label,
          id: data.id,
        });

        assert.deepEqual(openExternalCount, 1);
      });

      testSessionDetails("#getSessions should return the one created session");
      test(
        `the created session should have a token to build an authenticated fetch`,
        buildAuthenticatedFetchTest
      );
      test(`the authentication provider should be disposable`, testDisposal);

      test(
        `should be able to create a new authProvider using the existing secrets`,
        create
      );
      testSessionDetails(
        `#getSessions should return the same session created by the first auth provider`
      );
      test(
        `the re-created session should have a token to build an authenticated fetch`,
        buildAuthenticatedFetchTest
      );

      test(`testing remove session`, async function () {
        assert.deepEqual(await authProvider.removeAllSessions(), undefined);
      });

      test(
        "#getSessions should return an empty array after session removal",
        emptySessions
      );
      test("secretData storage should not contain any sessions", function () {
        // Check that there are no sessions hanging around in the secret data
        // assert.deepEqual(Object.keys(secretData), [
        //   '@inrupt/solid-client-authn:solidClientAuthn:registeredSessions',
        //   `@inrupt/solid-client-authn:issuerConfig:${data.oidcIssuer}`
        // ]);

        // Check there are no registered sessions in the list
        assert.deepEqual(
          secretData[
            "@inrupt/solid-client-authn:solidClientAuthn:registeredSessions"
          ],
          "[]"
        );
      });
      test(
        `the new authentication provider should be disposable`,
        testDisposal
      );
    });
  });
});
