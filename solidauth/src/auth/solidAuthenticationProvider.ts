import { QueryEngine } from '@comunica/query-sparql-solid';
import { Session, getSessionIdFromStorageAll, clearSessionFromStorageAll, } from '@inrupt/solid-client-authn-node';
import { interactiveLogin } from 'solid-node-interactive-auth';
import { v4 } from 'uuid';
import * as vscode from 'vscode';
import { AuthenticationProvider, AuthenticationProviderAuthenticationSessionsChangeEvent, Disposable, AuthenticationSession, EventEmitter, ExtensionContext } from 'vscode';
import { VscodeSessionStorage } from './vscodeStorage';
import { StorageUtility } from '@inrupt/solid-client-authn-core';
// TODO: Finish this based on https://www.eliostruyf.com/create-authentication-provider-visual-studio-code/

// TODO: Use this to get name of idp provider
// https://github.com/velocityzen/meta-extractor/blob/master/index.js

// TODO: Allow users to store a list of idp providers.



export class SolidAuthenticationProvider implements AuthenticationProvider, Disposable {
  public static readonly id = 'solidauth';
  private _sessionChangeEmitter = new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
  // private _disposable: Disposable;
  private _storage: VscodeSessionStorage;
  private s?: AuthenticationSession;
  // TODO: Add logging similar to https://github.com/microsoft/vscode/blob/main/extensions/github-authentication/src/github.ts
  private log = vscode.window.createOutputChannel('Solid Authentication');

  constructor(private readonly context: ExtensionContext) {
    this._storage = new VscodeSessionStorage(context);

    // this._disposable = Disposable.from(
    //   // TODO: Re-enable multi account support
    //   authentication.registerAuthenticationProvider(SolidAuthenticationProvider.id, 'Solid Ecosystem Authentication', this, { supportsMultipleAccounts: false }),
    // )
  }

  get onDidChangeSessions() {
    return this._sessionChangeEmitter.event;
  }

  async getSessions(scopes?: readonly string[] | undefined): Promise<readonly AuthenticationSession[]> {
    
    
    
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
      throw new Error('Can only get sessions with undefined scope');
    }

    console.log('get session called', this.s)

    return this.s ? [this.s] : [];
  }
  async createSession(scopes: readonly string[]): Promise<AuthenticationSession> {
    if (scopes.length !== 0) {
      throw new Error('Can only create sessions with no specified scopes');
    }

    const session = await this.login();

    if (session) {
      this.s = session;
      console.log('about to create session', this.s)
      return this.s;
    }

    throw new Error('Could not login');
  }

  async removeSession(sessionId: string): Promise<void> {
    await clearSessionFromStorageAll(this._storage.insecureStorage);
    await clearSessionFromStorageAll(this._storage.secureStorage);
    await clearSessionFromStorageAll(new StorageUtility(this._storage.secureStorage, this._storage.insecureStorage));
    
    console.log('removing', sessionId)
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
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Sign in to a Solid Provider",
      cancellable: true,
    }, async (progress, token) => {
      // TODO: Get these from a remote list of trusted providers
      let oidcIssuer = await vscode.window.showQuickPick([
        "https://login.inrupt.com/",
        "https://solidcommunity.net/",
        "https://solidweb.me/",
        "https://pod.playground.solidlab.be/",
        "https://openid.release-ap-1-standalone.inrupt.com/",
        "https://trinpod.us/gmxLogin",
        "http://localhost:3000/",
        "Other"
      ], {
        // TODO: Use I10n with https://github.com/microsoft/vscode/blob/main/extensions/github-authentication/src/githubServer.ts
        // for text throughout

        // Details on how to do this seem to be at https://github.com/microsoft/vscode-l10n

        title: "Select Pod Provider",
        placeHolder: "https://login.inrupt.com/"
      }, token);

      if (token.isCancellationRequested) {
        return;
      }

      if (oidcIssuer === 'Other') {
        oidcIssuer = await vscode.window.showInputBox({
          placeHolder: 'https://login.inrupt.com/',
          // placeHolder: 'http://localhost:3000/',
          prompt: 'Enter Pod Provider URL',
          value: 'https://login.inrupt.com/',
        }, token);
      }

      if (token.isCancellationRequested) {
        return;
      }

      progress.report({
        message: `Preparing to log in with ${oidcIssuer}`,
        // increment: 20
      });

      // TODO: Give this the right storage
      const session = new Session({
        secureStorage: this._storage.secureStorage,
        insecureStorage: this._storage.insecureStorage,
      });

      const handleRedirect = (url: string) => {
        if (!token.isCancellationRequested) {
          progress.report({
            message: `Redirecting to ${oidcIssuer}`,
          });
          // TODO: Handle the case where this returns false
          vscode.env.openExternal(vscode.Uri.parse(url))
        }
      }

      try {
        const redirectUrl = `${vscode.env.uriScheme}://${this.context.extension.id}/${v4()}/redirect`

        await session.login({
          redirectUrl,
          oidcIssuer,
          handleRedirect,
          clientName: `${vscode.env.appName} (${this.context.extension.packageJSON['name']})`
        });

        const uri = await new Promise<string>(resolve => {
          const disposable = vscode.window.registerUriHandler({
            handleUri: (uri: vscode.Uri) => {
              disposable.dispose();
              resolve(uri.toString(true));
            }
          });
        });

        progress.report({
          message: `Completing login`,
        });

        await session.handleIncomingRedirect(uri);
      } catch (e) {

        // Some servers cannot handle redirects to the vscode:// scheme
        // @see https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1483
        try {
          await interactiveLogin({
            oidcIssuer,
            session,
            handleRedirect
          });
        } catch (err) {
          // Just use the original error if the interactive login also fails
          throw e
        }
        // await interactiveLogin({
        //   // handleRedirect,
        //   // session
        // });
        // throw e
      }

      progress.report({
        message: `Loading details`,
      });

      const queryEngine = new QueryEngine();
      const bindings = await queryEngine.queryBindings(`
        SELECT * WHERE { <${session.info.webId}> <http://xmlns.com/foaf/0.1/name> ?o  }`, {
        '@comunica/actor-http-inrupt-solid-client-authn:session': session,
        sources: [session.info.webId!]
      }).then(d => d.toArray());

      let label: string | undefined
      if (bindings[0]?.get('o')?.value) {
        label = bindings[0]?.get('o')?.value
      }

      if (label === undefined) {
        const { webId } = session.info
        // TODO: Do webid validations
        const p = webId!.replace(/profile\/card#me$/, '').replace(/\/+$/, '').split('/');
        label = p[p.length - 1];
        await this._storage.insecureStorage.set(`webid-label-${session.info.sessionId}`, label);
      }

      return toAuthenticationSession(session, label);
    });
  }
}

function toAuthenticationSession(session: Session, label: string): AuthenticationSession | undefined {
  if (session.info.isLoggedIn && session.info.webId) {
    return {
      id: session.info.sessionId,
      accessToken: '',
      account: {
        label,
        id: session.info.webId,
        // @ts-ignore
        fetch: session.fetch
      },
      scopes: [],
    }
  }
}
