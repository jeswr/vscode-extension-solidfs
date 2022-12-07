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
import type { QueryEngine } from "@comunica/query-sparql-solid";
import type { Bindings } from "@rdfjs/types";
import { DataFactory as DF } from "n3";
import * as vscode from "vscode";
import {
  deleteFile,
  deleteContainer,
  createContainerAt,
  overwriteFile,
} from "@inrupt/solid-client";
import type { VscodeSolidSession } from "@inrupt/solid-vscode-auth";

const BasicContainer = DF.namedNode("http://www.w3.org/ns/ldp#BasicContainer");
// TODO: Make sure this is properly used 
const Container = DF.namedNode("http://www.w3.org/ns/ldp#Container");

// TODO: Work out why we are *first* getting non-existant file errors
// perhaps we need to clear the comunica cache at the start of a write operation?

// TODO: Add a toggle to show/hide the permissions data
// TODO: Work out why there is a 406 whenever we first create a file on the ESS
// TODO: Make this more secure by using the vscode SecretStorage

function getContainerData(binding: Bindings): [string, vscode.FileType] {
  const object = binding.get("o");
  const type = binding.get("type");

  if (!object || !type) {
    throw new Error("Invalid bindings");
  }

  return [
    object.value,
    type.equals(BasicContainer)
      ? vscode.FileType.Directory
      : vscode.FileType.File,
  ];
}

// TODO: Observe updates based on LDNs
// TODO: Create a research challenge for SEPA style updates in Comunica

export class SolidFS implements vscode.FileSystemProvider {
  private session:
    | VscodeSolidSession
    | undefined
    | Promise<VscodeSolidSession | undefined>;

  private root: string;

  private engine: QueryEngine;

  private stats: Record<string, boolean> = { "/": true };

  constructor(options: {
    session:
      | VscodeSolidSession
      | undefined
      | Promise<VscodeSolidSession | undefined>;
    root: string;
    engine: QueryEngine;
  }) {
    this.session = options.session;
    this.root = options.root;
    this.engine = options.engine;
  }

  private emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this.emitter.event;

  watch(
    uri: vscode.Uri,
    options: {
      readonly recursive: boolean;
      readonly excludes: readonly string[];
    }
  ): vscode.Disposable {
    // ignore, fires for all changes...
    return new vscode.Disposable(() => {});
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    console.log("stat called on", uri);

    // TODO: See if we should be looking up parent dir instead?
    if (!(uri.path in this.stats)) {
      const fileType = await new Promise<boolean | undefined>(
        (resolve, reject) => {
          const file = Promise.resolve(this.session).then((s) =>
            s?.fetch(`${this.root}${uri.path.slice(1)}`, { method: "HEAD" })
          );
          const dir = Promise.resolve(this.session).then((s) =>
            s?.fetch(`${this.root}${uri.path.slice(1)}/`, { method: "HEAD" })
          );
          let done = false;

          function final() {
            if (done) {
              resolve(undefined);
            }
            done = true;
          }

          file
            .then((res) => {
              if (res?.status === 200) {
                resolve(false);
              }
            })
            .finally(final);

          dir
            .then((res) => {
              if (res?.status === 200) {
                resolve(true);
              }
            })
            .finally(final);
        }
      );

      if (fileType !== undefined) {
        console.log("setting filetype", fileType, "for", uri.path);
        this.stats[uri.path] = fileType;
      }

      // const race = await Promise.race([ file, dir ])
      // race.url.endsWith('/')
    }

    if (uri.path in this.stats) {
      return {
        type: this.stats[uri.path]
          ? vscode.FileType.Directory
          : vscode.FileType.File,
        // TODO: Fetch this
        mtime: 0,
        size: 0,
        ctime: 0,
      };
    }

    console.log("abotu to throw stat error for", uri);

    throw vscode.FileSystemError.FileNotFound(uri);

    // if
    // return {
    //   type: vscode.FileType.Directory,
    //   mtime: 0,
    //   size: 0,
    //   ctime: 0
    // }
    // throw new Error('Method not implemented.');
  }

  // TODO: THIS CURRENTLY WORKS ON ESS since the type of the contained files is stored
  // in the container metadata.
  // TODO: See if we can just determine this based on trailing slash
  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    console.log("read directory called on", uri);
    const source = `${this.root}${
      uri.path.length > 1 ? `${uri.path.slice(1)}/` : ""
    }`;

    try {
      const session = await this.session;

      console.log("fetch object is", session, typeof session?.fetch);

      const bindings = await this.engine.queryBindings(
        `
      SELECT * WHERE { <${source}> <http://www.w3.org/ns/ldp#contains> ?o  }`,
        {
          "@comunica/actor-http-inrupt-solid-client-authn:session": {
            fetch: session?.fetch,
            info: {
              webId: session?.account.id,
              isLoggedIn: true,
            },
          },
          sources: [source],
        }
      );

      const res = await bindings
        .map<[string, vscode.FileType]>((binding) => {
          const str = binding.get("o")!.value;
          const isDir = str.endsWith("/");
          const path = str.slice(
            this.root.length - 1,
            str.length - Number(isDir)
          );
          this.stats[path] = isDir;

          return [
            str.slice(this.root.length - 1, str.length - Number(isDir)),
            isDir ? vscode.FileType.Directory : vscode.FileType.File,
          ];
        })
        .toArray();

      console.log("returning ", res);
      return res;
    } catch (e) {
      // TODO: Properly log this
      console.error("error reading directory", e);
    }

    return [];
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    // console.log("create directory called on", uri);
    await createContainerAt(`${this.root}${uri.path.slice(1)}/`, {
      fetch: (await this.session)?.fetch,
    });
    // TODO: Don't be as aggressive - just invalidate the parent
    await this.engine.invalidateHttpCache();

    this.fireSoon({ type: vscode.FileChangeType.Created, uri });
    // throw new Error('Method not implemented.');
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    try {
      const session = await this.session;
      if (session) {
        const result = await session.fetch(`${this.root}${uri.path.slice(1)}`);
        // TODO: Do not just return an empty buffer when fetch is not working
        if (result.status === 200) {
          return new Uint8Array(await result.arrayBuffer());
        }

        if (result.status === 406) {
          // This is a hack, currently ESS gives a 406 error when we are retrieving
          // an empty file
          // TODO: Error here once we have fixed the empty-file giving 406 error
          return Uint8Array.from([]);
        }

        // TODO: Be more granular with permissions here (e.g. throw )
        vscode.FileSystemError.Unavailable(await result.text());
      }
    } catch (e) {
      // noop
    }
    throw vscode.FileSystemError.FileNotFound(uri);
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { readonly create: boolean; readonly overwrite: boolean }
  ): Promise<void> {
    console.log("write file called on", uri);
    // TODO: See if we need to trigger an update
    const i = uri.path.lastIndexOf("/") + 1;

    // TODO: Predict this based on file type
    const data = await ((await this.session)?.fetch ?? (globalThis as any).fetch)(
      `${this.root}${uri.path.slice(1, i)}`,
      { method: "HEAD" }
    );
    let contentType;
    if (data.status !== 200) {
      const ext = uri.path.slice(uri.path.lastIndexOf(".") + 1);
      contentType = {
        ttl: "text/turtle",
        jsonld: "application/ld+json",
      }[ext];
    } else {
      contentType = data.headers.get("Content-Type") ?? undefined;
    }

    const buf = Buffer.from(content);
    console.log(buf.toString("utf8"));

    console.log("saving in container", `${this.root}${uri.path.slice(1, i)}`);
    console.log("with slug", uri.path.slice(i));
    console.log("with content type", contentType);

    await overwriteFile(`${this.root}${uri.path.slice(1)}`, buf, {
      fetch: (await this.session)?.fetch,
      contentType,
    });

    // Clear the comunica cache
    // TODO: Don't be as aggressive - just invalidate the parent
    await this.engine.invalidateHttpCache();

    delete this.stats[uri.path];
    if (data.status !== 200) {
      this.fireSoon({ type: vscode.FileChangeType.Changed, uri });
    } else {
      this.fireSoon({ type: vscode.FileChangeType.Created, uri });
    }

    // console.log('write file called', uri, content, options)

    // throw new Error('Method not implemented.');
  }

  async delete(
    uri: vscode.Uri,
    options: { readonly recursive: boolean }
  ): Promise<void> {
    console.log("delete called on", uri);
    // TODO: Handle recursive

    const stat = await this.stat(uri);

    if (stat.type === vscode.FileType.File) {
      await deleteFile(`${this.root}${uri.path.slice(1)}`, {
        fetch: (await this.session)?.fetch,
      });
    } else {
      await deleteContainer(`${this.root}${uri.path.slice(1)}/`, {
        fetch: (await this.session)?.fetch,
      });
    }

    // TODO: Don't be as aggressive - just invalidate the parent
    await this.engine.invalidateHttpCache();
    // TODO: Get this working
    this.fireSoon({ type: vscode.FileChangeType.Deleted, uri });

    return;

    throw new Error("Method not implemented.");
  }

  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { readonly overwrite: boolean }
  ): void | Thenable<void> {
    console.log("rename file called on", oldUri, newUri, options);
    throw new Error("Method not implemented.");
  }

  copy?(
    source: vscode.Uri,
    destination: vscode.Uri,
    options: { readonly overwrite: boolean }
  ): void | Thenable<void> {
    console.log("cope called on", source, destination, options);
    throw new Error("Method not implemented.");
  }

  private bufferedEvents: vscode.FileChangeEvent[] = [];

  private fireSoonHandle?: NodeJS.Timer;

  private fireSoon(...events: vscode.FileChangeEvent[]): void {
    this.bufferedEvents.push(...events);

    if (this.fireSoonHandle) {
      clearTimeout(this.fireSoonHandle);
    }

    this.fireSoonHandle = setTimeout(() => {
      this.emitter.fire(this.bufferedEvents);
      this.bufferedEvents.length = 0;
    }, 5);
  }
}
