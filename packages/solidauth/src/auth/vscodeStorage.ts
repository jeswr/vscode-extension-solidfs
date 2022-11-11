import type { IStorage, StorageUtility } from '@inrupt/solid-client-authn-core';
import { Session } from '@inrupt/solid-client-authn-node';
import { getClientAuthenticationWithDependencies } from '@inrupt/solid-client-authn-node/dist/dependencies';
import type { ExtensionContext } from 'vscode';
import { IMementoStorage, ISecretStorage } from '../storage';

function asArray(str: any, error = false): string[] {
  if (typeof str === 'string') {
    const arr = JSON.parse(str);
    if (Array.isArray(arr) && arr.every(elem => typeof elem === 'string')) {
      return arr;
    }
  }

  if (error)
    throw new Error('Expected an array of strings');

  return [];
}

function getSessions(storage: IMementoStorage) {
  return asArray(storage.getSync('solidClientAuthn:registeredSessions'));
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
    const sessions = await Promise.all(this.getSessionIds().map(id => this.getSessionFromId(id)));
    return sessions.filter((session): session is Session => session !== undefined);
  }
}
