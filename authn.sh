# This script patches the authentication libraries to remove proactive refresh since session management needs to be
# handled manually in the vscode authentication provider

P1='./node_modules/@inrupt/solid-client-authn-core/dist/index.js'
# Remove proactive refreshing from authenticatedFetch
if grep -q "currentRefreshOptions" $P1 ; then
    sed -i "401,435d" $P1
fi

# Add the refreshToken and timeouts to the storageUtility so that they can be accessed by the vscode Authentication
# Handler
P2='./node_modules/@inrupt/solid-client-authn-node/dist/login/oidc/incomingRedirectHandler/AuthCodeRedirectHandler.js'

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

if ! grep -Fxq "$PATCH_2" $P2 ; then
    sed -i "68 a$PATCH_2" $P2
    sed -i "62 a$PATCH_1" $P2
fi
