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
      { supportsMultipleAccounts: true }
    ),

    vscode.commands.registerCommand("solidauth.login", async () => {
      console.log("about to log in");
      const session = await getSolidFetch([], { createIfNone: true });
      console.log("logged in");
      vscode.window.showInformationMessage(`Welcome ${session?.account.label}`);
    }),

    vscode.commands.registerCommand("solidauth.logout", async () => {
      console.log("about to call remove all sessions");
      await authProvider.removeAllSessions();
      console.log("removing all sessions");
      // await authProvide

      // const sessions = await authProvider.getSessions();

      // // TODO: Introduce error handling here
      // await Promise.allSettled(
      //   sessions.map(async (session) => authProvider.removeSession(session.id))
      // );

      vscode.window.showInformationMessage(`Logged out of Solid Providers`);
    })
  );
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
