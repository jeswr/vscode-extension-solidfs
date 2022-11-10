import { IIncomingRedirectHandler, IStorageUtility, ISessionInfoManager, IIssuerConfigFetcher, IClientRegistrar, ITokenRefresher, ISessionInfo, getSessionIdFromOauthState, loadOidcContextFromStorage, IClient, KeyPair, generateDpopKeyPair, RefreshOptions, EVENTS, buildAuthenticatedFetch, getWebidFromTokenPayload, saveSessionInfoToStorage } from "@inrupt/solid-client-authn-core";
import { configToIssuerMetadata } from "@inrupt/solid-client-authn-node/dist/login/oidc/IssuerConfigFetcher";
import { KeyObject } from "crypto";
import { fetch as globalFetch } from "cross-fetch";
import { EventEmitter } from "events";
import { Issuer } from "openid-client";

export class AuthCodeRedirectHandler implements IIncomingRedirectHandler {
  constructor(
    private storageUtility: IStorageUtility,
    private sessionInfoManager: ISessionInfoManager,
    private issuerConfigFetcher: IIssuerConfigFetcher,
    private clientRegistrar: IClientRegistrar,
    private tokenRefresher: ITokenRefresher
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    try {
      const myUrl = new URL(redirectUrl);
      return (
        myUrl.searchParams.get("code") !== null &&
        myUrl.searchParams.get("state") !== null
      );
    } catch (e) {
      throw new Error(
        `[${redirectUrl}] is not a valid URL, and cannot be used as a redirect URL: ${e}`
      );
    }
  }

  async handle(
    inputRedirectUrl: string,
    eventEmitter?: EventEmitter
  ): Promise<ISessionInfo & { fetch: typeof globalFetch }> {
    if (!(await this.canHandle(inputRedirectUrl))) {
      throw new Error(
        `AuthCodeRedirectHandler cannot handle [${inputRedirectUrl}]: it is missing one of [code, state].`
      );
    }

    const url = new URL(inputRedirectUrl);
    // The type assertion is ok, because we checked in canHandle for the presence of a state
    const oauthState = url.searchParams.get("state") as string;
    url.searchParams.delete("code");
    url.searchParams.delete("state");

    const sessionId = await getSessionIdFromOauthState(
      this.storageUtility,
      oauthState
    );
    if (sessionId === undefined) {
      throw new Error(
        `No stored session is associated with the state [${oauthState}]`
      );
    }

    const oidcContext = await loadOidcContextFromStorage(
      sessionId,
      this.storageUtility,
      this.issuerConfigFetcher
    );

    const issuer = new Issuer(configToIssuerMetadata(oidcContext.issuerConfig));
    // This should also retrieve the client from storage
    const clientInfo: IClient = await this.clientRegistrar.getClient(
      { sessionId },
      oidcContext.issuerConfig
    );
    const client = new issuer.Client({
      client_id: clientInfo.clientId,
      client_secret: clientInfo.clientSecret,
      token_endpoint_auth_method: clientInfo.clientSecret
        ? "client_secret_basic"
        : "none",
      id_token_signed_response_alg: clientInfo.idTokenSignedResponseAlg,
    });

    const params = client.callbackParams(inputRedirectUrl);
    let dpopKey: KeyPair | undefined;

    if (oidcContext.dpop) {
      dpopKey = await generateDpopKeyPair();
    }
    const tokenSet = await client.callback(
      url.href,
      params,
      { code_verifier: oidcContext.codeVerifier, state: oauthState },
      // The KeyLike type is dynamically bound to either KeyObject or CryptoKey
      // at runtime depending on the environment. Here, we know we are in a NodeJS
      // context.
      { DPoP: dpopKey?.privateKey as KeyObject }
    );

    if (
      tokenSet.access_token === undefined ||
      tokenSet.id_token === undefined
    ) {
      // The error message is left minimal on purpose not to leak the tokens.
      throw new Error(
        `The Identity Provider [${issuer.metadata.issuer}] did not return the expected tokens: missing at least one of 'access_token', 'id_token.`
      );
    }
    let refreshOptions: RefreshOptions | undefined;
    if (tokenSet.refresh_token !== undefined) {
      eventEmitter?.emit(EVENTS.NEW_REFRESH_TOKEN, tokenSet.refresh_token);
      refreshOptions = {
        refreshToken: tokenSet.refresh_token,
        sessionId,
        tokenRefresher: this.tokenRefresher,
      };
    }

    const authFetch = await buildAuthenticatedFetch(
      globalFetch,
      tokenSet.access_token,
      {
        dpopKey,
        refreshOptions,
        eventEmitter,
        expiresIn: tokenSet.expires_in,
      }
    );

    // tokenSet.claims() parses the ID token, validates its signature, and returns
    // its payload as a JSON object.
    const webid = await getWebidFromTokenPayload(
      tokenSet.id_token,
      // The JWKS URI is mandatory in the spec, so the non-null assertion is valid.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      issuer.metadata.jwks_uri!,
      issuer.metadata.issuer,
      client.metadata.client_id
    );

    await saveSessionInfoToStorage(
      this.storageUtility,
      sessionId,
      webid,
      "true",
      tokenSet.refresh_token,
      undefined,
      dpopKey
    );

    await this.storageUtility.setForUser(sessionId, { access_token: tokenSet.access_token }, { secure: true });

    const sessionInfo = await this.sessionInfoManager.get(sessionId);
    if (!sessionInfo) {
      throw new Error(
        `Could not find any session information associated with SessionID [${sessionId}] in our storage.`
      );
    }

    return Object.assign(sessionInfo, {
      fetch: authFetch,
    });
  }
}
