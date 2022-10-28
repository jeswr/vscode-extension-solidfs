import type { IStorage } from '@inrupt/solid-client-authn-core';
import type { Memento } from 'vscode';

export class IMementoStorage implements IStorage {
  constructor (private memento: Memento, private prefix = '@inrupt/solid-client-authn:') {};

  getSync(key: string): string | undefined {
    const result = this.memento.get<string>(this.prefix + key);

    if (typeof result !== 'string' && typeof result !== 'undefined') {
      throw new Error(`Expected string or undefined, received ${result}`)
    }

    return result;
  }
  
  async get(key: string): Promise<string | undefined> {
    return this.getSync(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.memento.update(this.prefix + key, value);
  }

  async delete(key: string): Promise<void> {
    await this.memento.update(this.prefix + key, undefined);
  }
}
