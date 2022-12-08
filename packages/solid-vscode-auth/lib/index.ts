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
import { buildAuthenticatedFetch } from "@inrupt/solid-client-authn-core";
import { fetch as crossFetch } from "cross-fetch";
import { importJWK } from "jose";
import * as vscode from "vscode";

export const SOLID_AUTHENTICATION_PROVIDER_ID = "solidauth";

async function buildAuthenticatedFetchFromAccessToken(
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
  console.log("get solid fetch started");

  const session = await vscode.authentication.getSession(
    SOLID_AUTHENTICATION_PROVIDER_ID,
    scopes,
    options
  );

  console.log("session retrieved");

  if (!session) return;

  console.log("session not empty");

  let definedSession = session;

  // TODO: Remove race conditions here (although they are unlikely to occur on any reasonable timeout scenarios)
  vscode.authentication.onDidChangeSessions(async (sessions) => { 
    console.log('on did change sessions fired') 
    if (sessions.provider.id === SOLID_AUTHENTICATION_PROVIDER_ID) {
      console.log('ids match')
      const newSession = await vscode.authentication.getSession(
        SOLID_AUTHENTICATION_PROVIDER_ID,
        // Use the defined session scopes to ensure
        // that the same WebId is used
        definedSession.scopes,
        { ...options, createIfNone: false }
      );
      console.log('new session retrieved', newSession)

      if (definedSession.id === newSession?.id) {
        console.log('session updated')
        definedSession = newSession
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
