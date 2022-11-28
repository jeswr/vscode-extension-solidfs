import { buildAuthenticatedFetch } from "@inrupt/solid-client-authn-core";
import { fetch as crossFetch } from "cross-fetch";
import { importJWK } from "jose";
import * as vscode from "vscode";

const SOLID_AUTHENTICATION_PROVIDER_ID = 'solidauth';

async function buildAuthenticatedFetchFromAccessToken(
  accessToken: string
): Promise<typeof crossFetch> {
  let { access_token, privateKey, publicKey } = JSON.parse(accessToken);

  let dpopKey;
  if (privateKey && publicKey) {
    publicKey = JSON.parse(publicKey);
    privateKey = await importJWK(JSON.parse(privateKey), publicKey.alg);

    dpopKey = { publicKey, privateKey };
  }
  return buildAuthenticatedFetch(crossFetch, access_token, { dpopKey });
}

// TODO: Fix this entire function - it is hacky, but also should not be necessary after the next auth package
// release.
export async function getSolidFetch(scopes: readonly string[] = [], options?: vscode.AuthenticationGetSessionOptions) {
  let session = vscode.authentication.getSession(SOLID_AUTHENTICATION_PROVIDER_ID, scopes, options);

  // TODO: Remove race conditions here (although they are unlikely to occur on any reasonable timeout scenarios)
  vscode.authentication.onDidChangeSessions((sessions) => {
    if (sessions.provider.id === SOLID_AUTHENTICATION_PROVIDER_ID) {
      const newSession = vscode.authentication.getSession(
        SOLID_AUTHENTICATION_PROVIDER_ID,
        scopes,
        { ...options, createIfNone: false }
      );

      Promise.all([session, newSession]).then(([old, news]) => {
        if (old?.id === news?.id) {
          session = newSession;
        }
      });
    }
  });

  const f = async (input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Response> => {
    const token = (await session)?.accessToken;

    if (!token) {
      throw new Error('Session not found')
    }

    return (await buildAuthenticatedFetchFromAccessToken(token))(input, init)
  }

  return { 
    fetch: f,
    account: (await session)?.account
  }
}
