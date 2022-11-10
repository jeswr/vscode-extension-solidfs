// import { EVENTS, InvalidResponseError, KeyPair, OidcProviderError, RefreshOptions, REFRESH_BEFORE_EXPIRATION_SECONDS } from "@inrupt/solid-client-authn-core";
// import { DEFAULT_EXPIRATION_TIME_SECONDS } from "@inrupt/solid-client-authn-core/dist/authenticatedFetch/fetchFactory";

// async function refreshAccessToken(
//   refreshOptions: RefreshOptions,
//   dpopKey?: KeyPair,
// ): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
//   const tokenSet = await refreshOptions.tokenRefresher.refresh(
//     refreshOptions.sessionId,
//     refreshOptions.refreshToken,
//     dpopKey
//   );
//   return {
//     accessToken: tokenSet.accessToken,
//     refreshToken: tokenSet.refreshToken,
//     expiresIn: tokenSet.expiresIn,
//   };
// }

// /**
//  *
//  * @param expiresIn Delay until the access token expires.
//  * @returns a delay until the access token should be refreshed.
//  */
// const computeRefreshDelay = (expiresIn?: number): number => {
//   if (expiresIn !== undefined) {
//     return expiresIn - REFRESH_BEFORE_EXPIRATION_SECONDS > 0
//       ? // We want to refresh the token 5 seconds before they actually expire.
//         expiresIn - REFRESH_BEFORE_EXPIRATION_SECONDS
//       : expiresIn;
//   }
//   return DEFAULT_EXPIRATION_TIME_SECONDS;
// };




// const proactivelyRefreshToken = async () => {
//   try {
//     const {
//       accessToken: refreshedAccessToken,
//       refreshToken,
//       expiresIn,
//     } = await refreshAccessToken(
//       currentRefreshOptions,
//       // If currentRefreshOptions is defined, options is necessarily defined too.
//       // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//       options!.dpopKey,
//       // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//       options!.eventEmitter
//     );
//     // Update the tokens in the closure if appropriate.
//     currentAccessToken = refreshedAccessToken;
//     if (refreshToken !== undefined) {
//       currentRefreshOptions.refreshToken = refreshToken;
//     }
//     // Each time the access token is refreshed, we must plan fo the next
//     // refresh iteration.
//     clearTimeout(latestTimeout);
//     latestTimeout = setTimeout(
//       proactivelyRefreshToken,
//       computeRefreshDelay(expiresIn) * 1000
//     );
//     // If currentRefreshOptions is defined, options is necessarily defined too.
//     // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//     options!.eventEmitter?.emit(EVENTS.TIMEOUT_SET, latestTimeout);
//   } catch (e) {
//     // It is possible that an underlying library throws an error on refresh flow failure.
//     // If we used a log framework, the error could be logged at the `debug` level,
//     // but otherwise the failure of the refresh flow should not blow up in the user's
//     // face, so we just swallow the error.
//     if (e instanceof OidcProviderError) {
//       // The OIDC provider refused to refresh the access token and returned an error instead.
//       /* istanbul ignore next 100% coverage would require testing that nothing
//           happens here if the emitter is undefined, which is more cumbersome
//           than what it's worth. */
//       options?.eventEmitter?.emit(
//         EVENTS.ERROR,
//         e.error,
//         e.errorDescription
//       );
//       /* istanbul ignore next 100% coverage would require testing that nothing
//         happens here if the emitter is undefined, which is more cumbersome
//         than what it's worth. */
//       options?.eventEmitter?.emit(EVENTS.SESSION_EXPIRED);
//     }
//     if (
//       e instanceof InvalidResponseError &&
//       e.missingFields.includes("access_token")
//     ) {
//       // In this case, the OIDC provider returned a non-standard response, but
//       // did not specify that it was an error. We cannot refresh nonetheless.
//       /* istanbul ignore next 100% coverage would require testing that nothing
//         happens here if the emitter is undefined, which is more cumbersome
//         than what it's worth. */
//       options?.eventEmitter?.emit(EVENTS.SESSION_EXPIRED);
//     }
//   }