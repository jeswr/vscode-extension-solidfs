import type { IStorage } from "@inrupt/solid-client-authn-core";
import type { SecretStorage } from "vscode";

export class ISecretStorage implements IStorage {
  constructor(
    private secrets: SecretStorage,
    private prefix = "@inrupt/solid-client-authn:"
  ) {}

  async get(key: string): Promise<string | undefined> {
    return this.secrets.get(this.prefix + key);
  }

  async set(key: string, value: string): Promise<void> {
    return this.secrets.store(this.prefix + key, value);
  }

  async delete(key: string): Promise<void> {
    try {
      await this.secrets.delete(this.prefix + key);
    } catch (e) {
      // Suppress rejections as they occur when we
      // try to delete a key that is not set
    }
  }
}
