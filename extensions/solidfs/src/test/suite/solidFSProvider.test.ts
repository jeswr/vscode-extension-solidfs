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
import { afterEach, beforeEach, describe } from "mocha";
import { step, xstep } from "mocha-steps";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { getAuthenticatedFetch } from '@jeswr/css-auth-utils';
import { SolidFS } from '../../solidFS';
import * as assert from "assert";
import { VscodeSolidSession } from "@inrupt/solid-vscode-auth";

const scheme = 'solidfsTestRegistration';

function createUri(path: string) {
  return vscode.Uri.from({
    scheme,
    path
  });
}

suite("solidFS Provider Unit Test Suite", async () => {
  let disposable: vscode.Disposable;
  let fetchFn: typeof globalThis.fetch;

  beforeEach(async () => {
    fetchFn = await getAuthenticatedFetch({
      podName: "example",
      email: "hello@example.com",
      password: "abc123",
      url: 'http://localhost:3010/'
    });

    const provider = new SolidFS({
      root: 'http://localhost:3010/example/',
      // Without Metadata
      all: false,
      session: {
        fetch: fetchFn
      } as Partial<VscodeSolidSession> as VscodeSolidSession // TODO: Try and remove the need for type casting
    });

    disposable = vscode.workspace.registerFileSystemProvider(scheme, provider, { isCaseSensitive: true })
  });

  afterEach(async () => {
    await disposable.dispose();
  });

  // TODO: Work out how to do this with describe and mocka steps rather than one massive test.
  // TODO: Have content type checks
  test("Modify Pod", async () => {

    // Create a new folder in the root
    assert.strictEqual(
      await vscode.workspace.fs.createDirectory(createUri('/myFolder/')),
      void 0
    );
    
    // Create a new file in /myFolder/
    assert.strictEqual(
      await vscode.workspace.fs.writeFile(createUri('/myFolder/myFile'), (new TextEncoder).encode("<a> <b> <c> .")),
      void 0
    );

    // Create a new file in the root
    assert.strictEqual(
      await vscode.workspace.fs.writeFile(createUri('/myFile'), (new TextEncoder).encode("<a1> <b1> <c1> .")),
      void 0
    );

    // Create an empty file in the root
    assert.strictEqual(
      await vscode.workspace.fs.writeFile(createUri('/empty'), new Uint8Array()),
      void 0
    );

    // Create an empty ttl file in the root
    assert.strictEqual(
      await vscode.workspace.fs.writeFile(createUri('/myEmptyFile.ttl'), new Uint8Array()),
      void 0
    );

    assert.deepEqual(
      await vscode.workspace.fs.readFile(createUri('/myEmptyFile.ttl')),
      new Uint8Array()
    );
    
    console.log(`deleting [${createUri('')}]`)

    await vscode.workspace.fs.delete(createUri(''))

    // await assert.rejects(
    //   vscode.workspace.fs.delete(createUri('')) as Promise<void>,
    //   new Error('this is a message')
    // )

    // Delete root
    await assert.rejects(
      vscode.workspace.fs.delete(createUri('/')) as Promise<void>,
      // 'Fetching the Resource at [http://localhost:3010/example//] failed: [404] [Not Found].'
    )

    // Delete root - explicitly allowing recursive deletion
    await assert.rejects(
      vscode.workspace.fs.delete(createUri('/'), { recursive: true }) as Promise<void>,
      // 'Fetching the Resource at [http://localhost:3010/example//] failed: [404] [Not Found].'
    )

    // Delete root - explicitly forbidding recursive deletion
    await assert.rejects(
      vscode.workspace.fs.delete(createUri('/'), { recursive: false }) as Promise<void>,
      // 'Fetching the Resource at [http://localhost:3010/example//] failed: [404] [Not Found].'
    )
    
    // Reading the root directory
    assert.deepEqual(
      await vscode.workspace.fs.readDirectory(createUri('/')),
      // TODO: Dont make assumptions about order
      [
        [
          // CSS Specific
          "/README",
          vscode.FileType.File
        ],
        [
          // CSS Specific
          "/profile",
          vscode.FileType.Directory
        ],
        [
          "/myFolder",
          vscode.FileType.Directory
        ],
        [
          "/myFile",
          vscode.FileType.File
        ],
        [
          "/empty",
          vscode.FileType.File
        ],
        [
          "/myEmptyFile.ttl",
          vscode.FileType.File
        ]
      ]
    );

  assert.deepEqual(
    await vscode.workspace.fs.readDirectory(createUri('/myFolder')),
    // TODO: Dont make assumptions about order
    [
      [
        // CSS Specific
        "/myFolder/myFile",
        vscode.FileType.File
      ],
    ]
  );

  assert.deepEqual(
    await vscode.workspace.fs.readDirectory(createUri('/')),
    // TODO: Dont make assumptions about order
    [
      [
        // CSS Specific
        "/README",
        vscode.FileType.File
      ],
      [
        // CSS Specific
        "/profile",
        vscode.FileType.Directory
      ],
      [
        "/myFolder",
        vscode.FileType.Directory
      ],
      [
        "/myFile",
        vscode.FileType.File
      ],
      [
        "/empty",
        vscode.FileType.File
      ],
      [
        "/myEmptyFile.ttl",
        vscode.FileType.File
      ]
    ]
  );
});


  // describe("Modify Pod", () => {

  //   step("Create a new folder", async () => {
      // assert.strictEqual(
      //   await vscode.workspace.fs.createDirectory(createUri('/myFolder/')),
      //   void 0
      // );
  //   })

  //   xstep("Create a new file", async () => {
      // assert.strictEqual(
      //   await vscode.workspace.fs.writeFile(createUri('/myFile'), (new TextEncoder).encode("<a> <b> <c> .")),
      //   void 0
      // );
  //   })
  // });

  test("Stat on root directory", async () => {
    const rootStat = await vscode.workspace.fs.stat(createUri('/'));

    assert.strictEqual(
      rootStat.type,
      vscode.FileType.Directory
    );
  });

  test("Reading profile card", async () => {
    assert.match(
      String.fromCharCode(...await vscode.workspace.fs.readFile(createUri('/profile/card'))),
      /http:\/\/localhost:3010\/example\/profile\/card\#me/
    );
  });

  test("Should be a writable file system", () => {
    assert.equal(vscode.workspace.fs.isWritableFileSystem(scheme), true);
  })
});
