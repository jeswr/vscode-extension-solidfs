import { QueryEngine } from '@comunica/query-sparql-solid';
import type { Session } from '@inrupt/solid-client-authn-node';
import { Bindings } from '@rdfjs/types';
import { DataFactory as DF } from 'n3';
import * as vscode from 'vscode';
import { saveFileInContainer, deleteFile, deleteContainer, createContainerAt, overwriteFile,  } from '@inrupt/solid-client'
const BasicContainer = DF.namedNode('http://www.w3.org/ns/ldp#BasicContainer')
const Container = DF.namedNode('http://www.w3.org/ns/ldp#Container')

vscode.authentication.registerAuthenticationProvider

// TODO: Work out why we are *first* getting non-existant file errors
// perhaps we need to clear the comunica cache at the start of a write operation?

// TODO: Add a toggle to show/hide the permissions data
// TODO: Work out why there is a 406 whenever we first create a file on the ESS
// TODO: Make this more secure by using the vscode SecretStorage


function getContainerData(binding: Bindings): [string, vscode.FileType] {
  const object = binding.get('o');
  const type = binding.get('type');

  if (!object || !type) {
    throw new Error('Invalid bindings')
  }

  return [object.value, type.equals(BasicContainer) ? vscode.FileType.Directory : vscode.FileType.File];
}

// TODO: Observe updates based on LDNs
// TODO: Create a research challenge for SEPA style updates in Comunica

export class SolidFS implements vscode.FileSystemProvider {
  private session: Session | undefined | Promise<Session | undefined>
  private root: string;
  private engine: QueryEngine;
  private stats: Record<string, boolean> = { '/': true };

  constructor(options: { session: Session | undefined | Promise<Session | undefined>, root: string; engine: QueryEngine }) {
    this.session = options.session;
    this.root = options.root;
    this.engine = options.engine
  }

  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

  watch(uri: vscode.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): vscode.Disposable {
    console.log('watch called on', uri)

    // ignore, fires for all changes...
    return new vscode.Disposable(() => { });
  }
  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    console.log('stat called on', uri);

    // TODO: See if we should be looking up parent dir instead?
    if (!(uri.path in this.stats)) {

      const fileType = await new Promise<boolean | undefined>((resolve, reject) => {
        const file = Promise.resolve(this.session).then(s => s?.fetch(`${this.root}${uri.path.slice(1)}`, { method: 'HEAD' }));
        const dir = Promise.resolve(this.session).then(s => s?.fetch(`${this.root}${uri.path.slice(1)}/`, { method: 'HEAD' }));
        let done = false;

        function final() {
          if (done) {
            resolve(undefined)
          }
          done = true;
        }

        file.then(res => {
          if (res?.status === 200) {
            resolve(false)
          }
        }).finally(final);

        dir.then(res => {
          if (res?.status === 200) {
            resolve(true)
          }
        }).finally(final);
      });

      if (fileType !== undefined) {
        this.stats[uri.path] = fileType;
      }

      // const race = await Promise.race([ file, dir ])
      // race.url.endsWith('/')
    }


    if (uri.path in this.stats) {
      return {
        type: this.stats[uri.path] ? vscode.FileType.Directory : vscode.FileType.File,
        // TODO: Fetch this
        mtime: 0,
        size: 0,
        ctime: 0
      }
    }

    console.log('abotu to throw stat error for', uri)

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
    console.log('read directory called on', uri)
    const source = `${this.root}${uri.path.length > 1 ? uri.path.slice(1) + '/' : ''}`;

    const bindings = await this.engine.queryBindings(`
    SELECT * WHERE { <${source}> <http://www.w3.org/ns/ldp#contains> ?o  }`, {
      '@comunica/actor-http-inrupt-solid-client-authn:session': await this.session,
      sources: [source]
    });

    return bindings.map<[string, vscode.FileType]>(binding => {
      const str = binding.get('o')!.value;
      const isDir = str.endsWith('/');
      const path = str.slice(this.root.length - 1, str.length - Number(isDir));
      this.stats[path] = isDir;

      return [
        str.slice(this.root.length - 1, str.length - Number(isDir)),
        isDir ? vscode.FileType.Directory : vscode.FileType.File
      ]
    }).toArray();
  }
  async createDirectory(uri: vscode.Uri): Promise<void> {
    console.log('create directory called on', uri)
    await createContainerAt(
      `${this.root}${uri.path.slice(1)}/`,
      { fetch: (await this.session)?.fetch }
    )
    // TODO: Don't be as aggressive - just invalidate the parent
    await this.engine.invalidateHttpCache();

    this._fireSoon({ type: vscode.FileChangeType.Created, uri });
    // throw new Error('Method not implemented.');
  }
  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    try {
      const session = await this.session;
      if (session) {
        const result = await session.fetch(`${this.root}${uri.path.slice(1)}`);
        return new Uint8Array(await result.arrayBuffer());
      }
    } catch (e) {
      // noop
    }
    throw vscode.FileSystemError.FileNotFound(uri);
  }
  async writeFile(uri: vscode.Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): Promise<void> {
    console.log('write file called on', uri)
    // TODO: See if we need to trigger an update
    const i = uri.path.lastIndexOf('/') + 1;

    // TODO: Predict this based on file type
    const data = await ((await this.session)?.fetch ?? fetch)(`${this.root}${uri.path.slice(1, i)}`, { method: 'HEAD' });
    let contentType;
    if (data.status !== 200) {
      const ext = uri.path.slice(uri.path.lastIndexOf('.') + 1);
      contentType = {
        ttl: 'text/turtle',
        jsonld: 'application/ld+json'
      }[ext]
    } else {
      contentType = data.headers.get('Content-Type') ?? undefined;
    }

    const buf = Buffer.from(content);
    console.log(buf.toString('utf8'));

    console.log('saving in container', `${this.root}${uri.path.slice(1, i)}`)
    console.log('with slug', uri.path.slice(i))
    console.log('with content type', contentType)

    await overwriteFile(`${this.root}${uri.path.slice(1)}`, buf, {
      fetch: (await this.session)?.fetch,
      contentType,
    });

    // Clear the comunica cache
    // TODO: Don't be as aggressive - just invalidate the parent
    await this.engine.invalidateHttpCache();

    delete this.stats[uri.path]
    if (data.status !== 200) {
      this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
    } else {
      this._fireSoon({ type: vscode.FileChangeType.Created, uri });
    }

    // console.log('write file called', uri, content, options)

    // throw new Error('Method not implemented.');
  }
  async delete(uri: vscode.Uri, options: { readonly recursive: boolean; }): Promise<void> {
    console.log('delete called on', uri)
    // TODO: Handle recursive

    const stat = await this.stat(uri);

    if (stat.type === vscode.FileType.File) {
      await deleteFile(
        `${this.root}${uri.path.slice(1)}`,
        { fetch: (await this.session)?.fetch }
      )
    } else {
    await deleteContainer(
      `${this.root}${uri.path.slice(1)}/`,
      { fetch: (await this.session)?.fetch }
    )
    }

        // TODO: Don't be as aggressive - just invalidate the parent
        await this.engine.invalidateHttpCache();
        // TODO: Get this working
        this._fireSoon({ type: vscode.FileChangeType.Deleted, uri });
        

        return;

    throw new Error('Method not implemented.');
  }
  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
    console.log('rename file called on', oldUri, newUri, options)
    throw new Error('Method not implemented.');
  }
  copy?(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
    console.log('cope called on', source, destination, options)
    throw new Error('Method not implemented.');
  }

  private _bufferedEvents: vscode.FileChangeEvent[] = [];
  private _fireSoonHandle?: NodeJS.Timer;

  private _fireSoon(...events: vscode.FileChangeEvent[]): void {
    this._bufferedEvents.push(...events);

    if (this._fireSoonHandle) {
      clearTimeout(this._fireSoonHandle);
    }

    this._fireSoonHandle = setTimeout(() => {
      this._emitter.fire(this._bufferedEvents);
      this._bufferedEvents.length = 0;
    }, 5);
  }
}

