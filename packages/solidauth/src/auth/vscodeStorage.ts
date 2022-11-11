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
import type { IStorage } from "@inrupt/solid-client-authn-core";
import { Session } from "@inrupt/solid-client-authn-node";
import { getClientAuthenticationWithDependencies } from "@inrupt/solid-client-authn-node/dist/dependencies";
import type { ExtensionContext } from "vscode";
import { IMementoStorage, ISecretStorage } from "../storage";

function asArray<T>(str: T, error = false): string[] {
  if (typeof str === "string") {
    const arr = JSON.parse(str);
    if (Array.isArray(arr) && arr.every((elem) => typeof elem === "string")) {
      return arr;
    }
  }

  if (error) throw new Error("Expected an array of strings");

  return [];
}

function getSessions(storage: IMementoStorage) {
  return asArray(storage.getSync("solidClientAuthn:registeredSessions"));
}

interface Storages {
  readonly secureStorage: IStorage;
  readonly insecureStorage: IStorage;
}

export class VscodeSessionStorage implements Storages {
  public readonly secureStorage: IStorage;

  public readonly insecureStorage: IStorage;

  private get clientAuthentication() {
    return getClientAuthenticationWithDependencies(this);
  }

  constructor(context: ExtensionContext) {
    this.secureStorage = new ISecretStorage(context.secrets);
    this.insecureStorage = new IMementoStorage(context.workspaceState);
  }

  getSessionIds(): string[] {
    return getSessions(this.insecureStorage as IMementoStorage);
  }

  async getSessionFromId(sessionId: string) {
    const { clientAuthentication } = this;

    const sessionInfo = await clientAuthentication.getSessionInfo(sessionId);
    if (sessionInfo === undefined) {
      return undefined;
    }

    return new Session({
      sessionInfo,
      clientAuthentication,
    });
  }

  async getSessions() {
    const sessions = await Promise.all(
      this.getSessionIds().map((id) => this.getSessionFromId(id))
    );
    return sessions.filter(
      (session): session is Session => session !== undefined
    );
  }
}
