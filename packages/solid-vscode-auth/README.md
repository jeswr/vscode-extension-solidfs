# `@jeswr/solid-vscode-auth`

This is a _temporary package_ to help log into a Solid Pod provider with the vscode AuthenticationProvider API.
This package will be depricated a once the core Inrupt authn libraries expose the required low-level functionality
to achieve this.

## Usage

```ts
import { getSolidFetch } from "@jeswr/solid-vscode-auth";
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
