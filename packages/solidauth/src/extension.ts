// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';
import { fetch } from 'cross-fetch';
import { importJWK } from 'jose';
import * as vscode from 'vscode';
import { SolidAuthenticationProvider } from './auth';

async function buildAuthenticatedFetchFromAccessToken(accessToken: string): Promise<typeof fetch> {
	let { access_token, privateKey, publicKey } = JSON.parse(accessToken);

	let dpopKey = undefined;
	if (privateKey && publicKey) {
		publicKey = JSON.parse(publicKey);
		privateKey = await importJWK(JSON.parse(privateKey), publicKey.alg);

		dpopKey = { publicKey, privateKey }
	}
	return buildAuthenticatedFetch(fetch, access_token, { dpopKey })
}

export function activate(context: vscode.ExtensionContext) {
	const authProvider = new SolidAuthenticationProvider(context);

	context.subscriptions.push(

		vscode.authentication.registerAuthenticationProvider(
			SolidAuthenticationProvider.id, 'Solid Ecosystem Authentication',
			authProvider,
			// TODO: Introduce multi-account support
			{ supportsMultipleAccounts: false }
		),

		vscode.commands.registerCommand('solidauth.login', async () => {
			const session = await vscode.authentication.getSession(SolidAuthenticationProvider.id, [], { createIfNone: true });
			vscode.authentication.onDidChangeSessions(sessions => {
				if (sessions.provider.id === SolidAuthenticationProvider.id) {
					console.log('session did change', sessions)
				}
			});

			vscode.window.showInformationMessage(`Welcome ${session.account.label}`);
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
