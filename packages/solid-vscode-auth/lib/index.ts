import { buildAuthenticatedFetch } from "@inrupt/solid-client-authn-core";
import { fetch as crossFetch } from "cross-fetch";
import { importJWK } from "jose";
import * as vscode from "vscode";

export const SOLID_AUTHENTICATION_PROVIDER_ID = "solidauth";

export async function buildAuthenticatedFetchFromAccessToken(
  accessToken: string
): Promise<typeof crossFetch> {
  // eslint-disable-next-line camelcase, prefer-const
  let { access_token, privateKey, publicKey } = JSON.parse(accessToken);

  let dpopKey;
  if (privateKey && publicKey) {
    publicKey = JSON.parse(publicKey);
    privateKey = await importJWK(JSON.parse(privateKey), publicKey.alg);

    dpopKey = { publicKey, privateKey };
  }
  return buildAuthenticatedFetch(crossFetch, access_token, { dpopKey });
}

export interface VscodeSolidSession {
  fetch: typeof globalThis.fetch;
  account: vscode.AuthenticationSession["account"];
}

// TODO: Fix this entire function - it is hacky, but also should not be necessary after the next auth package
// release.
export async function getSolidFetch(
  scopes: readonly string[],
  options?: vscode.AuthenticationGetSessionOptions
): Promise<VscodeSolidSession | undefined> {
  const session = await vscode.authentication.getSession(
    SOLID_AUTHENTICATION_PROVIDER_ID,
    scopes,
    options
  );

  if (!session) return;

  let definedSession = session;

  // TODO: Remove race conditions here (although they are unlikely to occur on any reasonable timeout scenarios)
  vscode.authentication.onDidChangeSessions(async (sessions) => {
    if (sessions.provider.id === SOLID_AUTHENTICATION_PROVIDER_ID) {
      const newSession = await vscode.authentication.getSession(
        SOLID_AUTHENTICATION_PROVIDER_ID,
        // Use the defined session scopes to ensure
        // that the same WebId is used
        definedSession.scopes,
        { ...options, createIfNone: false }
      );

      if (definedSession.id === newSession?.id) {
        definedSession = newSession;
      }
    }
  });

  const f = async (
    input: RequestInfo | URL,
    init?: RequestInit | undefined
  ): Promise<Response> => {
    const token = definedSession.accessToken;

    if (!token) {
      throw new Error("Session not found");
    }

    return (await buildAuthenticatedFetchFromAccessToken(token))(input, init);
  };

  return {
    fetch: f,
    account: definedSession.account,
  };
}
