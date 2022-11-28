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
import type { Memento } from "vscode";

export class IMementoStorage implements IStorage {
  constructor(
    private memento: Memento,
    private prefix = "@inrupt/solid-client-authn:"
  ) {}

  getSync(key: string): string | undefined {
    const result = this.memento.get<string>(this.prefix + key);

    if (typeof result !== "string" && typeof result !== "undefined") {
      throw new Error(`Expected string or undefined, received ${result}`);
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
