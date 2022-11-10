// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SolidAuthenticationProvider } from './auth';
import { Session } from '@inrupt/solid-client-authn-node';
import { buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';
import { VscodeSessionStorage } from './auth/vscodeStorage';
import { fetch } from 'cross-fetch';
import { saveFileInContainer } from '@inrupt/solid-client';
import { QueryEngine } from '@comunica/query-sparql-solid';
import { importJWK } from 'jose';
import { KeyLike } from 'crypto';

async function buildAuthenticatedFetchFromAccessToken(accessToken: string): Promise<typeof fetch> {
	let { access_token, privateKey, publicKey } = JSON.parse(accessToken);

	let dpopKey = undefined;
	if (privateKey && publicKey) {
		publicKey = JSON.parse(publicKey);
		privateKey = await importJWK(JSON.parse(privateKey), publicKey.alg);

		dpopKey = { publicKey, privateKey }
	}

	// privateKey = JSON.parse(privateKey);
	// publicKey = JSON.parse(publicKey);
	// console.log(rawPrivateKey)
	// rawPrivateKey = JSON.parse(rawPrivateKey);
	// console.log('building authenticated fetch with', privateKey, publicKey, rawPrivateKey)
	// const imported = await importJWK(privateKey, publicKey.alg);
	// console.log('the imported private key is', imported)

	return buildAuthenticatedFetch(fetch, access_token, { dpopKey })
}

// function makeAuthenticatedFetch(accessToken: string, ...args: Parameters<typeof fetch>) {
// 	const { access_token, privateKey, publicKey } = JSON.parse(accessToken);

// 	return buildAuthenticatedFetch(fetch, access_token, {
// 		dpopKey: {
// 			publicKey,
// 			privateKey
// 		}
// 	})
// }

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const authProvider = new SolidAuthenticationProvider(context);
	const engine = new QueryEngine();

	context.subscriptions.push(

		vscode.authentication.registerAuthenticationProvider(
			SolidAuthenticationProvider.id, 'Solid Ecosystem Authentication',
			authProvider,
			// TODO: Introduce multi-account support
			{ supportsMultipleAccounts: false }
		),

		vscode.commands.registerCommand('solidauth.login', async () => {
			const session = await vscode.authentication.getSession(SolidAuthenticationProvider.id, [], { createIfNone: true });

			vscode.window.showInformationMessage(`Welcome ${session.account.label}`);

			const myFetch = await buildAuthenticatedFetchFromAccessToken(session.accessToken);

			console.log('build authenticated fetch')

			const bindings = await engine.queryBindings(
				`SELECT DISTINCT * WHERE { <${session.account.id}> <http://www.w3.org/ns/pim/space#storage> ?o }`, {
				sources: [session.account.id]
			});

			const roots = await bindings.map(binding => binding.get('o')?.value ?? null).toArray();

			const slug = `solidAuth-${Date.now()}.ttl`;
			await saveFileInContainer(roots[0], Buffer.from('<http://example.org#Jesse> a <http://example.org#Person>'), { fetch: myFetch, slug, contentType: 'text/turtle' })

			console.log('attempting to retrieve', `${roots[0]}${slug}`)
			const all = await engine.queryBindings(
				`SELECT DISTINCT * WHERE { ?s ?p ?o }`, {
				sources: [`${roots[0]}${slug}`],
				'@comunica/actor-http-inrupt-solid-client-authn:session': <Session>{
					info: {
						webId: session.account.id,
						isLoggedIn: true,
					},
					fetch: myFetch
				}
			});
			// const data = JSON.parse(session.accessToken)

			console.log(await all.toArray())

			console.log('logged in with session', JSON.parse(session.accessToken))
			
			// vscode.authentication.onDidChangeSessions(e => {
			// 	e.provider
			// })

			// vscode
			// const _storage = new VscodeSessionStorage(context);
			// const s = new Session({
			//   secureStorage: _storage.secureStorage,
			//   insecureStorage: _storage.insecureStorage,
			// 	sessionInfo: { 
			// 		sessionId: session.id,
			// 		webId: session.account.id,
			// 		isLoggedIn: true
			// 	 }
			// });

			// console.log(s)
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
