# solidauth

Provides Authentication for the Solid Ecosystem.

## Features

This extension should be used via the `vscode.authentication` API. To get a Solid Session for your extension - do the following

```ts
const session = await vscode.authentication.getSession("solidauth", [], {
  createIfNone: true,
});
vscode.window.showInformationMessage(`Welcome ${session.account.label}`);
```

## Requirements

To use this extension make sure to add `inrupt.solidauth` to your extension dependencies in the extension you are building; this can be done by adding the following to the package.json

```ts
"extensionDependencies": [
  "inrupt.solidauth"
],
```

## Known Issues

## Release Notes
