# This script patches the authentication libraries to remove proactive refresh since session management needs to be
# handled manually in the vscode authentication provider

# Remove proactive refreshing from authenticatedFetch
if grep -q "currentRefreshOptions" ./node_modules/@inrupt/solid-client-authn-core/dist/index.js ; then
    sed -i "401,435d" ./node_modules/@inrupt/solid-client-authn-core/dist/index.js
fi

# Patch the authentication token in the AuthCodeRedirectHandler so that it can be accessed
# After line 62
PATCH_1="await this.storageUtility.setForUser(sessionId, { refreshToken: tokenSet.refresh_token }, { secure: true });"
# After line 68
PATCH_2="await this.storageUtility.setForUser(sessionId, { access_token: tokenSet.access_token }, { secure: true });\
let expires_at = typeof tokenSet.expires_at === \"number\"\
 ? tokenSet.expires_at.toString()\
 : Math.floor(tokenSet.expires_in + Date.now() / 1000).toString();\
if (typeof expires_at === \"number\")\
 await this.storageUtility.setForUser( sessionId, { expires_at }, { secure: true });\
if (typeof tokenSet.expires_in === \"number\")\
 await this.storageUtility.setForUser( sessionId, { expires_in: tokenSet.expires_in.toString() }, { secure: true });"

if ! grep -Fxq "$PATCH_2" ./node_modules/@inrupt/solid-client-authn-node/dist/login/oidc/incomingRedirectHandler/AuthCodeRedirectHandler.js
then
    sed -i "68 a$PATCH_2" ./node_modules/@inrupt/solid-client-authn-node/dist/login/oidc/incomingRedirectHandler/AuthCodeRedirectHandler.js
    sed -i "62 a$PATCH_1" ./node_modules/@inrupt/solid-client-authn-node/dist/login/oidc/incomingRedirectHandler/AuthCodeRedirectHandler.js
fi
