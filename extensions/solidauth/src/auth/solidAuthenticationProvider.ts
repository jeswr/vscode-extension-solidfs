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
  getSessionIdFromStorageAll,
  getSessionFromStorage,
} from "@inrupt/solid-client-authn-node";
// import { StorageUtility } from "@inrupt/solid-client-authn-core";

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
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
// TODO: Finish this based on https://www.eliostruyf.com/create-authentication-provider-visual-studio-code/

// TODO: Use this to get name of idp provider
// https://github.com/velocityzen/meta-extractor/blob/master/index.js

// TODO: Allow users to store a list of idp providers.
import AuthCodeRedirectHandler from "./AuthCodeRedirectHandler";
import { ISecretStorage } from '../storage/'

// TODO: Introduce

export class SolidAuthenticationProvider implements AuthenticationProvider, Disposable {
  public static readonly id = "solidauth";

  private sessionChangeEmitter =
    new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();

  // private _disposable: Disposable;
  private storage: StorageUtility;

  private sessions?: Promise<Record<string, AuthenticationSession>>;

  // TODO: Add logging similar to https://github.com/microsoft/vscode/blob/main/extensions/github-authentication/src/github.ts
  private log = vscode.window.createOutputChannel("Solid Authentication");

  constructor(private readonly context: ExtensionContext) {
    const secretStorage = new ISecretStorage(context.secrets);
    this.storage = new StorageUtility(secretStorage, secretStorage);
  }

  get onDidChangeSessions() {
    return this.sessionChangeEmitter.event;
  }

  async _getSessions() {
    const sessionIds = await getSessionIdFromStorageAll(this.storage);
    const sessions = await Promise.all(
      // TODO: Monkey patch the session here so that we can update the access_token at
      // appropriate times
      sessionIds.map(sessionId => toAuthenticationSessionOrClear(sessionId, this.storage))
    );

    const sessionsMap: Record<string, AuthenticationSession> = {}
    for (const session of sessions) {
      if (session) {
        sessionsMap[session.id] = session
      }
    }

    return sessionsMap;
  }

  async getSessions(
    scopes?: readonly string[] | undefined
  ): Promise<readonly AuthenticationSession[]> {
    // If we do not have any sessions cached then recover them from the storage
    if (!this.sessions) {
      this.sessions = this._getSessions();
    }

    let allSessions = Object.values(await this.sessions);

    if (scopes) {
      allSessions = allSessions.filter(session => scopes.every(scope => session.scopes.includes(scope)))
    }

    return allSessions;
  }

  async createSession(
    scopes: readonly string[]
  ): Promise<AuthenticationSession> {

    // TODO: Fix this so that we can used the webId and issuer scopes
    if (scopes.length !== 0) {
      throw new Error("Can only create sessions with no specified scopes");
    }

    let session: AuthenticationSession | undefined;
    
    await (this.sessions = this.sessions?.then(async sessions => {
      session = await this.login();
      if (session) {
        sessions[session.id] = session;
      }
      return sessions;
    }))

    if (session) {
      return session;
    }

    throw new Error("Could not login");
  }

  async removeAllSessions() {
    await clearSessionFromStorageAll(this.storage);
    this.sessions = undefined;
  }

  async removeSession(sessionId: string): Promise<void> {
    this.storage.deleteAllUserData(sessionId);

    if (this.sessions) {
      this.sessions = this.sessions.then(sessions => {
        delete sessions[sessionId];
        return sessions;
      })
    }
  }

  // async removeSession(sessionId: string): Promise<void> {
    
    
  //   // await (this.sessions as any)?.session.logout();
  //   // delete this.sessions;

  //   // await clearSessionFromStorageAll(this.storage);
  //   // await clearSessionFromStorage()
  // }

  /**
   * Dispose the registered services
   */
  // eslint-disable-next-line class-methods-use-this
  public async dispose() {
    // TODO: Dispose of refresh token process here
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
          storage: this.storage,
          // secureStorage: this.storage.secureStorage,
          // insecureStorage: this.storage.insecureStorage,
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
          const redirectUrl = `${vscode.env.uriScheme}://${this.context.extension.id
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
              storage: this.storage,
            });

            await interactiveLogin({
              oidcIssuer,
              session,
              handleRedirect,
              clientName,
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

        let label: string | undefined = bindings[0]?.get("o")?.value;

        if (label === undefined) {
          const { webId } = session.info;
          // TODO: Do webid validations
          const p = webId!
            .replace(/profile\/card#me$/, "")
            .replace(/\/+$/, "")
            .split("/");
          label = p[p.length - 1];
          await this.storage.setForUser(session.info.sessionId, { label }, { secure: true });
        }

        // TODO: At this point we should be hooking into whichever handler has the updated access_
        // session.onNewRefreshToken(() => {

        // })

        // Listen in for the custom event indicating a new access token
        // TODO: Do removed on logout style events
        session.on("access_token", async (access_token: string) => {
          await this.storage.setForUser(session.info.sessionId, { access_token }, { secure: true })

          this.sessionChangeEmitter.fire({
            changed: [
              await toAuthenticationSession(session, this.storage),
            ],
            added: [],
            removed: [],
          });
        });

        return await toAuthenticationSession(session, this.storage);
      }
    );
  }
}

async function toAuthenticationSessionOrClear(
  sessionId: string,
  storage: IStorageUtility,
): Promise<void | vscode.AuthenticationSession> {
  try {
    // Do not remove this await otherwise the error will reject outside
    // of the try/catch statement
    return await toAuthenticationSessionFromStorage(sessionId, storage)
  } catch {
    return await storage.deleteAllUserData(sessionId);
  }
}

async function toAuthenticationSessionFromStorage(
  sessionId: string,
  storage: IStorageUtility,
) {
  const session = await getSessionFromStorage(sessionId, storage);

  if (!session) {
    throw new Error("Could not restore session");
  }

  return toAuthenticationSession(session, storage);
}

async function getAccessToken(sessionId: string, storage: IStorageUtility): Promise<string> {
  return JSON.stringify({
    access_token: await storage.getForUser(sessionId, 'access_token', { secure: true, errorIfNull: true }),
    privateKey: await storage.getForUser(sessionId, 'privateKey', { secure: true, errorIfNull: true }),
    publicKey: await storage.getForUser(sessionId, 'publicKey', { secure: true, errorIfNull: true }),
  })
}

async function toAuthenticationSession(
  session: Session,
  storage: IStorageUtility,
): Promise<AuthenticationSession> {
  const { isLoggedIn, webId, sessionId } = session.info;

  if (!isLoggedIn)
    throw new Error("Cannot create authentication session for session that is not logged in");

  if (!webId)
    throw new Error("webId is not defined for session");

  return {
    id: session.info.sessionId,
    accessToken: await getAccessToken(sessionId, storage),
    account: {
      label: (await storage.getForUser(sessionId, 'label', { secure: true, errorIfNull: true }))!,
      id: webId,
    },
    scopes: [
      `webId:${webId}`,
      `issuer:${await storage.getForUser(sessionId, 'issuer', { secure: true, errorIfNull: true })}`
    ],
  }
}
