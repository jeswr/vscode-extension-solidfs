# solidauth

Provides Authentication for the Solid Ecosystem.

## Using the authentication provider `@inrupt/solid-vscode-auth`

We currently recommend using `@inrupt/solid-vscode-auth` to get a solid authentication session and build a fetch function. It's usage is as follows:

```ts
import { getSolidFetch } from "@inrupt/solid-vscode-auth";
import { getSolidDataset } from "@inrupt/solid-client";

function loginAndFetch() {
  // Get the existing login session if the user is logged into a
  // solid Pod provider, or triggers the login flow otherwise
  const { fetch, account } = getSolidFetch([], { createIfNone: true });
  const webid = account.id;

  // Fetching the dataset of the WebId
  const dataset = await getSolidDataset(webid, { fetch });
}
```

## Using the authentication provider directly (not currently recommended)

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
