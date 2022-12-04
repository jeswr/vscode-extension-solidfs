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
