//
// Copyright 2022 Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
import { QueryEngine } from "@comunica/query-sparql-solid";
import * as vscode from "vscode";
import { getSolidFetch } from "@inrupt/solid-vscode-auth";
import LinkHeader = require("http-link-header");
import { SolidFS } from "./solidFS";
// TODO: Investigate https://stackoverflow.com/questions/61959354/vscode-extension-add-custom-command-to-right-click-menu-in-file-explorer

// TODO:
// TODO: Just use the WebID data once https://github.com/CommunitySolidServer/CommunitySolidServer/issues/910 is closed
export async function getPodRoot(
  url: string,
  fetchFn: typeof globalThis.fetch
): Promise<string | null> {
  const splitUrl = url.split("/");
  for (let index = splitUrl.length - 1; index > 2; index -= 1) {
    const currentUrl = `${splitUrl.slice(0, index).join("/")}/`;
    // eslint-disable-next-line no-await-in-loop
    const res = await fetchFn(currentUrl);
    if (!res.ok)
      throw new Error(
        `HTTP Error Response requesting ${url}: ${res.status} ${res.statusText}`
      );
    const linkHeaders = res.headers.get("Link");
    if (!linkHeaders) return null;
    const headers = LinkHeader.parse(linkHeaders);
    for (const header of headers.refs) {
      if (
        header.uri === "http://www.w3.org/ns/pim/space#Storage" &&
        header.rel === "type"
      ) {
        return currentUrl.endsWith("/") ? currentUrl : `${currentUrl}/`;
      }
    }
  }
  return null;
}

function initFileSystem(context: vscode.ExtensionContext, engine: QueryEngine) {
  console.log("begin init file system");

  const roots = context.workspaceState.get<Record<string, string[]>>(`solidfs`);

  console.log("the roots are", roots);

  if (roots) {
    for (const webId of Object.keys(roots)) {
      console.log(webId, roots[webId])
      for (const root of roots[webId]) {
        // TODO: Fix this - we should be using the webId in the scope to indicate what we want
        const session = getSolidFetch([], { createIfNone: false });

        // TODO: Refactor this
        context.subscriptions.push(
          vscode.workspace.registerFileSystemProvider(
            `solidfs-${hashCode(webId)}-${hashCode(root)}`,
            new SolidFS({ session, root, engine }),
            { isCaseSensitive: true }
          )
        );        
        // TODO: Implement this in a way that it is not activated prior to clear
        // maybe it is just a matter of when it is called?
        // if (
        //   !vscode.workspace.workspaceFolders ||
        //   !vscode.workspace.workspaceFolders.map(folder => folder.name)
        //     .includes(`solidfs-${hashCode(webId)}-${hashCode(root)}`)
        //   ) {
        //     // Add the workspace folder if it is not there already
        //     vscode.workspace.updateWorkspaceFolders(
        //       vscode.workspace.workspaceFolders
        //         ? vscode.workspace.workspaceFolders.length
        //         : 0,
        //       null,
        //       {
        //         uri: vscode.Uri.parse(
        //           `solidfs-${hashCode(webId)}-${hashCode(root)}:/`
        //         ),
        //         name: new URL(webId).pathname.split("/").find((x) => x !== ""),
        //       }
        //     );
        // }
      }
    }
  }

  console.log("end inti file system");
}

// See https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
function hashCode(str: string) {
  let hash = 0;
  let i;
  let chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  const engine = new QueryEngine();

  // TODO: Fix this hack
  try {
    initFileSystem(context, engine);
  } catch (e) {
    console.log("could not init fs - clearing storage", e);
    await context.workspaceState.update("solidfs", undefined);
  }

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "solidfs.open",
    async () => {
      // TODO: Potentially use scopes to indicate the webId that we want to log in with
      const session = await getSolidFetch([], { createIfNone: true });
      const webId = session?.account.id;
      const fetch = session?.fetch;

      console.log('solidfs opened with', !!fetch, webId)

      if (!webId || !fetch) return;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Load Solid Pod",
          cancellable: false,
        },
        async (progress, token) => {
          progress.report({ message: "loading Pod root" });

          const root = await getPodRoot(webId, fetch);
          let roots = root ? [root] : [];

          if (roots.length === 0) {
            const bindings = await engine.queryBindings(
              `SELECT DISTINCT * WHERE { <${webId}> <http://www.w3.org/ns/pim/space#storage> ?o }`,
              {
                sources: [webId],
              }
            );

            roots = await bindings
              .map((binding) => binding.get("o")?.value ?? null)
              .toArray();
          }

          progress.report({ message: "preparing workspace" });

          await context.workspaceState.update(`solidfs`, { [webId]: roots });

          for (const root of roots) {

            try {
              context.subscriptions.push(
                vscode.workspace.registerFileSystemProvider(
                  `solidfs-${hashCode(webId)}-${hashCode(root)}`,
                  new SolidFS({ session, root, engine }),
                  { isCaseSensitive: true }
                )
              );
            } catch (e) {
              // Suppress errors from registering an existing fs provider
            }

            console.log('about to update workspace folder');

            vscode.workspace.updateWorkspaceFolders(
              vscode.workspace.workspaceFolders
                ? vscode.workspace.workspaceFolders.length
                : 0,
              null,
              {
                uri: vscode.Uri.parse(
                  `solidfs-${hashCode(webId)}-${hashCode(root)}:/`
                ),
                // name: new URL(webId).pathname.split("/").find((x) => x !== ""),
                name: session.account.label
              }
            );

            console.log('after update workspace folder');

          }
        }
      );

      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      // vscode.window.showInformationMessage('Hello World from solidFS!');
    }
  );

  context.subscriptions.push(
    disposable,

    vscode.commands.registerCommand('solidfs.clear', async () => {
      await context.workspaceState.update("solidfs", undefined);
    })
    
  );
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export async function deactivate(context: vscode.ExtensionContext) {
  console.log("deactivating ...");
  await context.workspaceState.update("solidfs", undefined);
}
