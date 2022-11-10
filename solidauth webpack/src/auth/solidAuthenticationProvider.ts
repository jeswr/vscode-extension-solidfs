import { authentication, AuthenticationProvider, AuthenticationProviderAuthenticationSessionsChangeEvent, AuthenticationSession, Disposable, Event, EventEmitter, ExtensionContext } from 'vscode';
import * as vscode from 'vscode';
import { Session } from '@inrupt/solid-client-authn-node';
import { VscodeSessionStorage } from './vscodeStorage';
import { v4 } from 'uuid';
import { QueryEngine } from '@comunica/query-sparql-solid';
// TODO: Finish this based on https://www.eliostruyf.com/create-authentication-provider-visual-studio-code/

// TODO: Use this to get name of idp provider
// https://github.com/velocityzen/meta-extractor/blob/master/index.js

// TODO: Allow users to store a list of idp providers.

class VscodeSession extends Session implements vscode.UriHandler {
  async handleUri(uri: vscode.Uri): Promise<void> {
    await this.handleIncomingRedirect(uri.toString());
  }
}

function getAuthenticationSession(session: Session): AuthenticationSession {

  return {
    id: session.info.sessionId,
    accessToken: '',
    account: {
      id: session.info.webId!,
      label: '',
    },
    scopes: [],
  }
}

export class SolidAuthenticationProvider implements AuthenticationProvider {
  public static readonly id = 'solidAuth';
  private _sessionChangeEmitter = new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
  // private _disposable: Disposable;
  private _storage: VscodeSessionStorage;
  private s?: AuthenticationSession;

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
    if (scopes !== undefined && scopes.length !== 0) {
      throw new Error('Can only get sessions with undefined scope');
    }

    return [];
  }
  async createSession(scopes: readonly string[]): Promise<AuthenticationSession> {
    if (scopes.length !== 0) {
      throw new Error('Can only create sessions with no specified scopes');
    }

    const session = await this.login();

    if (session) {
      this.s = {
        id: session.session.info.sessionId,
        account: {
          id: session.session.info.webId!,
          label: session.label,
        },
        accessToken: '',
        scopes: [],
        session
      } as AuthenticationSession;
      return this.s;
    }

    throw new Error('Could not login');
  }

  async removeSession(sessionId: string): Promise<void> {
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

      // TODO: Give this the right storage
      const session = new Session();
      const redirectUrl = `${vscode.env.uriScheme}://${this.context.extension.id}/${v4()}/redirect`

      progress.report({
        message: `Preparing to log in with ${oidcIssuer}`,
        // increment: 20
      });

      await session.login({
        redirectUrl,
        oidcIssuer,
        handleRedirect: (url: string) => {
          if (!token.isCancellationRequested) {
            progress.report({
              message: `Redirecting to ${oidcIssuer}`,
              // increment: 20
            });
            // TODO: Handle the case where this returns false
            vscode.env.openExternal(vscode.Uri.parse(url))
          }
        },
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
        // increment: 20
      });

      await session.handleIncomingRedirect(uri);

      progress.report({
        message: `Loading details`,
        // increment: 20
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
        label = p[p.length - 1]
      }


      return { session, label };
    });
  }
}
