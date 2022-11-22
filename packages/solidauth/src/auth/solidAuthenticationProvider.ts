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
import { QueryEngine } from "@comunica/query-sparql";
import {
  Session,
  clearSessionFromStorageAll,
} from "@inrupt/solid-client-authn-node";
import { interactiveLogin } from "solid-node-interactive-auth";
import { v4 } from "uuid";
import * as vscode from "vscode";
import type {
  AuthenticationProvider,
  AuthenticationProviderAuthenticationSessionsChangeEvent,
  Disposable,
  AuthenticationSession,
  ExtensionContext,
} from "vscode";
import { EventEmitter } from "vscode";
import {
  StorageUtility,
  loadOidcContextFromStorage,
} from "@inrupt/solid-client-authn-core";
// TODO: Finish this based on https://www.eliostruyf.com/create-authentication-provider-visual-studio-code/

// TODO: Use this to get name of idp provider
// https://github.com/velocityzen/meta-extractor/blob/master/index.js

// TODO: Allow users to store a list of idp providers.

import IssuerConfigFetcher from "@inrupt/solid-client-authn-node/dist/login/oidc/IssuerConfigFetcher";
import { VscodeSessionStorage } from "./vscodeStorage";
import AuthCodeRedirectHandler from "./AuthCodeRedirectHandler";

// TODO: Introduce

export class SolidAuthenticationProvider
  implements AuthenticationProvider, Disposable
{
  public static readonly id = "solidauth";

  private sessionChangeEmitter =
    new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();

  // private _disposable: Disposable;
  private storage: VscodeSessionStorage;

  private s?: AuthenticationSession;

  // TODO: Add logging similar to https://github.com/microsoft/vscode/blob/main/extensions/github-authentication/src/github.ts
  private log = vscode.window.createOutputChannel("Solid Authentication");

  constructor(private readonly context: ExtensionContext) {
    this.storage = new VscodeSessionStorage(context);

    // this._disposable = Disposable.from(
    //   // TODO: Re-enable multi account support
    //   authentication.registerAuthenticationProvider(SolidAuthenticationProvider.id, 'Solid Ecosystem Authentication', this, { supportsMultipleAccounts: false }),
    // )
  }

  get onDidChangeSessions() {
    return this.sessionChangeEmitter.event;
  }

  async getSessions(
    scopes?: readonly string[] | undefined
  ): Promise<readonly AuthenticationSession[]> {
    // TODO: work out how to make this work
    // const sessions = await this._storage.getSessions();

    // console.log('retrieved', sessions.length)

    // const mappedSessions = await Promise.all(
    //   sessions.map(
    //     async session =>
    //       toAuthenticationSession(
    //         session,
    //         await this._storage.insecureStorage.get(`webid-label-${session.info.sessionId}`) ?? ''
    //       )
    //   )
    // );

    // console.log('mapped', sessions.length)

    // return mappedSessions.filter((session): session is AuthenticationSession => session !== undefined)

    // console.log('get session called with', scopes);
    if (scopes !== undefined && scopes.length !== 0) {
      throw new Error("Can only get sessions with undefined scope");
    }

    // console.log('get session called', this.s)

    return this.s ? [this.s] : [];
  }

  async createSession(
    scopes: readonly string[]
  ): Promise<AuthenticationSession> {
    if (scopes.length !== 0) {
      throw new Error("Can only create sessions with no specified scopes");
    }

    const session = await this.login();

    if (session) {
      this.s = session;
      // console.log('about to create session', this.s)
      return this.s;
    }

    throw new Error("Could not login");
  }

  async removeSession(sessionId: string): Promise<void> {
    await clearSessionFromStorageAll(this.storage.insecureStorage);
    await clearSessionFromStorageAll(this.storage.secureStorage);
    await clearSessionFromStorageAll(
      new StorageUtility(
        this.storage.secureStorage,
        this.storage.insecureStorage
      )
    );

    await (this.s as any)?.session.logout();
    delete this.s;
  }

  /**
   * Dispose the registered services
   */
  public async dispose() {
    // this._disposable.dispose();
  }

  private async login() {
    // TODO: Finish this based on https://www.eliostruyf.com/create-authentication-provider-visual-studio-code/
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Sign in to a Solid Provider",
        cancellable: true,
      },
      async (progress, token) => {
        // TODO: Get these from a remote list of trusted providers (and then cache)
        let oidcIssuer = await vscode.window.showQuickPick(
          [
            "https://login.inrupt.com/",
            "https://solidcommunity.net/",
            "https://solidweb.me/",
            "https://pod.playground.solidlab.be/",
            // "https://openid.release-ap-1-standalone.inrupt.com/",
            "https://trinpod.us/gmxLogin",
            "http://localhost:3000/",
            "Other",
          ],
          {
            // TODO: Use I10n with https://github.com/microsoft/vscode/blob/main/extensions/github-authentication/src/githubServer.ts
            // for text throughout

            // Details on how to do this seem to be at https://github.com/microsoft/vscode-l10n

            title: "Select Pod Provider",
            placeHolder: "https://login.inrupt.com/",
          },
          token
        );

        if (token.isCancellationRequested) {
          return;
        }

        if (oidcIssuer === "Other") {
          oidcIssuer = await vscode.window.showInputBox(
            {
              placeHolder: "https://login.inrupt.com/",
              // placeHolder: 'http://localhost:3000/',
              prompt: "Enter Pod Provider URL",
              value: "https://login.inrupt.com/",
            },
            token
          );
        }

        if (token.isCancellationRequested) {
          return;
        }

        progress.report({
          message: `Preparing to log in with ${oidcIssuer}`,
          // increment: 20
        });

        // TODO: Give this the right storage
        let session = new Session({
          secureStorage: this.storage.secureStorage,
          insecureStorage: this.storage.insecureStorage,
          // clientAuthentication
        });

        // Monkey patch the AuthCodeRedirectHandler with our custom one that saves the access_token to secret storage
        const currentHandler = (session as any).clientAuthentication
          .redirectHandler.handleables[0];
        (session as any).clientAuthentication.redirectHandler.handleables[0] =
          new AuthCodeRedirectHandler(
            currentHandler.storageUtility,
            currentHandler.sessionInfoManager,
            currentHandler.issuerConfigFetcher,
            currentHandler.clientRegistrar,
            currentHandler.tokenRefresher
          );

        // TODO: See if it is plausible for this to occur after redirect call is made
        const handleRedirect = async (url: string) => {
          if (!token.isCancellationRequested) {
            progress.report({
              message: `Redirecting to ${oidcIssuer}`,
            });

            if (!(await vscode.env.openExternal(vscode.Uri.parse(url)))) {
              // TODO: Work out if we should be logging here instead
              throw new Error("Could not open browser to login");
            }
          }
        };

        const clientName = `${vscode.env.appName} (${this.context.extension.packageJSON.name})`;

        try {
          const redirectUrl = `${vscode.env.uriScheme}://${
            this.context.extension.id
          }/${v4()}/redirect`;

          await session.login({
            redirectUrl,
            oidcIssuer,
            handleRedirect,
            clientName,
          });

          const uri = await new Promise<string>((resolve) => {
            const disposable = vscode.window.registerUriHandler({
              handleUri: (uriToHandle: vscode.Uri) => {
                // Close the URI handler as soon as the redirect has
                // taken place
                disposable.dispose();
                resolve(uriToHandle.toString(true));
              },
            });
          });

          progress.report({
            message: `Completing login`,
          });

          await session.handleIncomingRedirect(uri);
        } catch (e) {
          // Some servers cannot handle redirects to the vscode:// scheme
          // @see https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1483
          // TODO: Work out why this is currently broken on the 1.1.1 version interactiveLogin
          // Ive tried against css 5.0.0 and 5.1.0 and both don't seem to work. Same error also occurs in PodSpaces
          // if you force an error above.
          // We should also try different versions of the interactiveAuth package since we introduced a fix there

          try {
            session = new Session({
              secureStorage: this.storage.secureStorage,
              insecureStorage: this.storage.insecureStorage,
              // clientAuthentication
            });

            await interactiveLogin({
              oidcIssuer,
              session,
              handleRedirect,
              clientName
            });
          } catch (err) {
            // Just use the original error if the interactive login also fails
            throw e;
          }
        }

        progress.report({
          message: `Loading details`,
        });

        const queryEngine = new QueryEngine();
        const bindings = await queryEngine
          .queryBindings(
            `
        SELECT * WHERE { <${session.info.webId}> <http://xmlns.com/foaf/0.1/name> ?o  }`,
            {
              "@comunica/actor-http-inrupt-solid-client-authn:session": session,
              sources: [session.info.webId!],
            }
          )
          .then((d) => d.toArray());

        let label: string | undefined;
        if (bindings[0]?.get("o")?.value) {
          label = bindings[0]?.get("o")?.value;
        }

        if (label === undefined) {
          const { webId } = session.info;
          // TODO: Do webid validations
          const p = webId!
            .replace(/profile\/card#me$/, "")
            .replace(/\/+$/, "")
            .split("/");
          label = p[p.length - 1];
          await this.storage.insecureStorage.set(
            `webid-label-${session.info.sessionId}`,
            label
          );
        }

        // TODO: See if this should be a private member of the class
        const storageUtility = new StorageUtility(
          this.storage.secureStorage,
          this.storage.insecureStorage
        );

        const data = await loadOidcContextFromStorage(
          session.info.sessionId,
          new StorageUtility(
            this.storage.secureStorage,
            this.storage.insecureStorage
          ),
          new IssuerConfigFetcher(storageUtility)
        );

        const secure = await this.storage.secureStorage.get(
          `solidClientAuthenticationUser:${session.info.sessionId}`
        );
        const insecureAccess = await this.storage.insecureStorage.get(
          `solidClientAuthenticationUser:${session.info.sessionId}`
        );

        // if (!accessToken) {
        //   throw new Error('Access token could not be found in secure storage')
        // }

        let d: Record<string, any> = {};

        if (secure) {
          d = { ...d, ...JSON.parse(secure) };
        }

        if (insecureAccess) {
          d = { ...d, ...JSON.parse(insecureAccess) };
        }

        d = {
          access_token: d.access_token,
          privateKey: d.privateKey,
          publicKey: d.publicKey,
        };

        // TODO: At this point we should be hooking into whichever handler has the updated access_
        // session.onNewRefreshToken(() => {

        // })

        // Listen in for the custom event indicating a new access token
        // TODO: Do removed on logout style events
        session.on("access_token", async (accessToken: string) => {
          d.access_token = accessToken;

          const newSession = toAuthenticationSession(
            session,
            label!,
            JSON.stringify(d)
          );

          if (newSession) {
            this.sessionChangeEmitter.fire({
              changed: [newSession],
              added: [],
              removed: [],
            });
          }
        });

        return toAuthenticationSession(session, label, JSON.stringify(d));
      }
    );
  }
}

function toAuthenticationSession(
  session: Session,
  label: string,
  accessToken: string
): AuthenticationSession | undefined {
  if (session.info.isLoggedIn && session.info.webId) {
    return {
      id: session.info.sessionId,
      accessToken,
      account: {
        label,
        id: session.info.webId,
      },
      scopes: [],
    };
  }
}
