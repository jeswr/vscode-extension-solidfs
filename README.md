# Solid vscode extensions

This repo contains the source code for vscode extensions to aid in the development of applications in Solid. Currently, the following extensions are provided:
  1. solidauth - implements the vscode `AuthenticationProvider` API to provide access to Solid authentication sessions in other vscode extensions.
  2. solidfs - view the filesytem view of solid.

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
npm run solidauth:link
npm run solidauth:install
```

*Note* If you make changes to `solidauth` and want to test the changes in another package make sure to re-run
```shell
npm run package
npm run solidauth:link
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
npm run solidauth:link
npm run solidauth:install
code ./extensions/solidfs/
```

and then press `fn`+`F5` in the new vscode window that is opened.