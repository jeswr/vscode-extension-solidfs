// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { QueryEngine } from '@comunica/query-sparql-solid';
import { Session } from '@inrupt/solid-client-authn-node';
import * as vscode from 'vscode';
// import { SolidAuthenticationProvider } from './auth';
import { v4 } from 'uuid';

export class SolidAuthenticationProvider implements vscode.AuthenticationProvider {
	constructor(private context: vscode.ExtensionContext) {

	}

	onDidChangeSessions: vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent> = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>().event;
	getSessions(scopes?: readonly string[] | undefined): Thenable<readonly vscode.AuthenticationSession[]> {
		throw new Error('Method not implemented.');
	}
	createSession(scopes: readonly string[]): Thenable<vscode.AuthenticationSession> {
		throw new Error('Method not implemented.');
	}
	removeSession(sessionId: string): Thenable<void> {
		throw new Error('Method not implemented.');
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

    //   const bindings = await queryEngine.queryBindings(`
    //     SELECT * WHERE { <${session.info.webId}> <http://xmlns.com/foaf/0.1/name> ?o  }`, {
    //     '@comunica/actor-http-inrupt-solid-client-authn:session': session,
    //     sources: [session.info.webId!]
    //   }).then(d => d.toArray());

    //   let label: string | undefined
    //   if (bindings[0]?.get('o')?.value) {
    //     label = bindings[0]?.get('o')?.value
    //   }

    //   if (label === undefined) {
    //     const { webId } = session.info
    //     // TODO: Do webid validations
    //     const p = webId!.replace(/profile\/card#me$/, '').replace(/\/+$/, '').split('/');
    //     label = p[p.length - 1]
    //   }


    //   return { session, label };
    });
  }
  
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('extension activated')
	
	try {
		const authProvider = new SolidAuthenticationProvider(context)
	} catch (e) {
		console.error(e);
	}
	

	context.subscriptions.push(
		
		// vscode.authentication.registerAuthenticationProvider(
		// 	SolidAuthenticationProvider.id, 'Solid Ecosystem Authentication',
		// 	authProvider,
		// 	// TODO: Introduce multi-account support
		// 	{ supportsMultipleAccounts: false }
		// ),

		vscode.commands.registerCommand('solidauth.login', async () => {
			// const session = await vscode.authentication.getSession(SolidAuthenticationProvider.id, [], { createIfNone: true });
	
			// vscode.window.showInformationMessage(`Welcome ${session.account.label}`);
			vscode.window.showInformationMessage(`Welcome no one`);
		}),

		vscode.commands.registerCommand('solidauth.logout', async () => {
			// const sessions = await authProvider.getSessions();
			
			// // TODO: Introduce error handling here
			// await Promise.allSettled(
			// 	sessions.map(async session => authProvider.removeSession(session.id))
			// );

			vscode.window.showInformationMessage(`Logged out of Solid Providers`);
		}),
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
