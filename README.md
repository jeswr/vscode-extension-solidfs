# Solid vscode extensions

This repo contains the source code for vscode extensions to aid in the development of applications in Solid. Currently, the following extensions are provided:

1. `solidAuth` - implements the vscode `AuthenticationProvider` API to provide access to Solid authentication sessions in other vscode extensions.
2. `solidFs` - view the filesytem view of Solid.

## Developing the Extensions

To begin developing in this repository run

```
# Install dependencies
# Note that the authn packages are patched using `authn.sh` in a postinstall step
npm i
```

then from the root use the hotkey `fn`+`f5` to launch the extension development host; this invokes the launch configuration in the root of the project that will build and launch `solidAuth` and `solidFS` together in an [Extension Development Host](https://code.visualstudio.com/api/advanced-topics/extension-host) with a [Temporary Profile](https://code.visualstudio.com/updates/v1_72#_extension-debugging-in-a-clean-environment).

<!-- (what follows is the required steps before we had a good launch config)
## Setup

```shell
# Install packages
npm install

# Build the local packages
npm run build

# Build the extensions
npm run package

# Link solidauth to any other extensions that
# require it in their environment (such as solidfs)
npm run solidauth:install
```

_Note_ If you make changes to `solidauth` and want to test the changes in another package make sure to re-run

```shell
npm run package
npm run solidauth:install
```

## Testing an extension

To test an extension, open the folder for the extension in vscode (e.g. by running `code ./extensions/solidfs`) and
then run `fn`+`F5` to open the extension development environment.

## SolidFS Quickstart

To quickly get started testing the solidfs extension run the following commands:

```shell
gh repo clone inrupt/vscode-extension-solidfs
cd ./vscode-extension-solidfs
npm install
npm run build
npm run package
npm run solidauth:install
code ./extensions/solidfs/
```

and then press `fn`+`F5` in the new vscode window that is opened.

_or_

```shell
gh repo clone inrupt/vscode-extension-solidfs
cd ./vscode-extension-solidfs
npm run predev:solidfs
```

and then press `fn`+`F5` in the new vscode window that is opened.

## Additional (temporary) development workaround

Because the [`--extensions-dir` option to code cli is ignored in ^1.74.0 of vscode](https://github.com/microsoft/vscode/issues/169035) the `solidauth:install` command does not work as expected; and so solidfs development will not work without *globally* installing the `solidauth` extension. If you need to do this run the following from the project root

```
npm run solidauth:global:install
```

to install the `solidauth` package after running the above commands. Note - this *will* override your installation of `solidauth` from the vscode marketplace if you have one.

To cleanup after development, run

```
npm run solidauth:global:uninstall
```

__Though unlikely it may be that this was part of [an intentional change in vscode behaviour](https://github.com/microsoft/vscode/issues/166147#issuecomment-1313717266).__ If this is the case we will need to update our test launch configuration files to account for this.

## authn dependencies

We have had to customise the authentication libraries to handle session management in vscode. The following 2 files
have been modified compared to the source code for the authn libraries

core/src/authenticatedFetch/fetchFactory - removed token refreshing functionality
node/src/login/oidc/incomingRedirectHandler/AuthCodeRedirectHandler -
ensure refresh token and access_token are saved to storage

In each case comments starting with "===" have been added to indicate where the files deviate from the original authn
libraries
-->

## Installation warning

_Note_ there is the following deprecation warning when installing the extension in the command line

```bash
(node:57198) [DEP0005] DeprecationWarning: Buffer() is deprecated due to security and usability issues. Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.
```

It occurs due to the use of `cross-fetch` in a nested dependency which uses a deprecated version of `node-fetch` and in turn `whatwg-url`.
