// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SolidAuthenticationProvider } from './auth';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const authProvider = new SolidAuthenticationProvider(context)

	context.subscriptions.push(

		vscode.authentication.registerAuthenticationProvider(
			SolidAuthenticationProvider.id, 'Solid Ecosystem Authentication',
			authProvider,
			// TODO: Introduce multi-account support
			{ supportsMultipleAccounts: false }
		),

		vscode.commands.registerCommand('solidauth.login', async () => {
			const session = await vscode.authentication.getSession(SolidAuthenticationProvider.id, [], { createIfNone: true });
			console.log('logged in with session', session.account, (session.account as any).fetch)
			vscode.window.showInformationMessage(`Welcome ${session.account.label}`);
			// vscode.authentication.onDidChangeSessions(e => {
			// 	e.provider
			// })

			// vscode
		}),

		vscode.commands.registerCommand('solidauth.logout', async () => {
			const sessions = await authProvider.getSessions();

			// TODO: Introduce error handling here
			await Promise.allSettled(
				sessions.map(async session => authProvider.removeSession(session.id))
			);

			vscode.window.showInformationMessage(`Logged out of Solid Providers`);
		}),
	);
}

// This method is called when your extension is deactivated
export function deactivate() { }
