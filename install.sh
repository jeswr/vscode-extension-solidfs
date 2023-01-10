AUTHN_VERSION=1.12.4
PACKAGES_BASE=./solid-client-authn-js-$AUTHN_VERSION/packages

# Copy the auth libs
mkdir ./tmp
cd ./tmp
wget https://github.com/inrupt/solid-client-authn-js/archive/refs/tags/v$AUTHN_VERSION.tar.gz
tar -xzf ./v$AUTHN_VERSION.tar.gz
cp -r $PACKAGES_BASE/core/ ../packages/core/
cp -r $PACKAGES_BASE/node/ ../packages/node/
cd ..
rm -rf ./tmp

# Patch the necessary files
cp ./patches/fetchFactory.ts ./packages/core/src/authenticatedFetch/fetchFactory.ts
cp ./patches/AuthCodeRedirectHandler.ts ./packages/node/src/login/oidc/incomingRedirectHandler/AuthCodeRedirectHandler.ts
