import { IStorage } from '@inrupt/solid-client-authn-core';
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
}

// function getStorageFromExtensionContext(context: ExtensionContext) {

// }


// export async function getSessionFromContext(sessionId: string, context: ExtensionContext) {
//   const clientAuthentication = getClientAuthenticationWithDependencies({
//     secureStorage: new ISecretStorage(context.secrets),
//     insecureStorage: new MementoStorage(context.workspaceState),
//   });

//   const sessionInfo = await clientAuthentication.getSessionInfo(sessionId);
//   if (sessionInfo === undefined) {
//     return undefined;
//   }

//   const session = new Session({

//   });
// }


// class VscodeStorage extends StorageUtility {
//   constructor(context: ExtensionContext) {

//     super(
//       new ISecretStorage(context.secrets),
//       new MementoStorage(context.workspaceState)
//     )

//     const data = getClientAuthenticationWithDependencies({})

//   }
// }

// const sessionInfo = await clientAuth.getSessionInfo(sessionId);
// if (sessionInfo === undefined) {
//   return undefined;
// }
// const session = new Session_1.Session({
//   sessionInfo,
//   clientAuthentication: clientAuth,
//   onNewRefreshToken,
// });
// // TODO: Ask nick if we need to do this
// if (sessionInfo.refreshToken) {
//   await session.login({
//     oidcIssuer: sessionInfo.issuer,
//   });
// }
// return session;

