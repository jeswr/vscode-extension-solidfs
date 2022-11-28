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
import { getSolidFetch } from "@inrupt/solid-vscode-auth";
import * as vscode from "vscode";
import { SolidAuthenticationProvider } from "./auth";

export function activate(context: vscode.ExtensionContext) {
  const authProvider = new SolidAuthenticationProvider(context);

  context.subscriptions.push(
    vscode.authentication.registerAuthenticationProvider(
      SolidAuthenticationProvider.id,
      "Solid Ecosystem Authentication",
      authProvider,
      // TODO: Introduce multi-account support
      { supportsMultipleAccounts: false }
    ),

    vscode.commands.registerCommand("solidauth.login", async () => {
      const session = await getSolidFetch([], { createIfNone: true });
      vscode.window.showInformationMessage(`Welcome ${session?.account.label}`);
    }),

    vscode.commands.registerCommand("solidauth.logout", async () => {
      const sessions = await authProvider.getSessions();

      // TODO: Introduce error handling here
      await Promise.allSettled(
        sessions.map(async (session) => authProvider.removeSession(session.id))
      );

      vscode.window.showInformationMessage(`Logged out of Solid Providers`);
    })
  );
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
