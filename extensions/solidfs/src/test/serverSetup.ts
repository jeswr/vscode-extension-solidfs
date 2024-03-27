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
import * as path from "path";
import { createApp as create } from "@jeswr/css-init-utils";

export function createApp() {
  return create({
    port: 3_010,
    loggingLevel: "off",
    seededPodConfigJson: path.join(
      __dirname,
      "..",
      "..",
      "src",
      "test",
      "configs",
      "solid-css-seed.json"
    ),
  });
}

// (async () => {

//   console.log('creating')

//   const app = await createApp();

//   console.log('starting')

//   await app.start();

//   console.log('started')

//   await app.stop();

//   console.log('stopped')

// })();

// interface ISecretData {
//   id: string;
//   secret: string;
// }

// // From https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/
// function getSecret(): Promise<ISecretData> {
//   return fetch('http://localhost:3001/idp/credentials/', {
//     method: 'POST',
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify({ email: config[0].email, password: config[0].password, name: config[0].podName }),
//   }).then(res => res.json());
// }

// interface ITokenData {
//   accessToken: string;
//   dpopKey: KeyPair;
// }

// // From https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/
// async function refreshToken({ id, secret }: ISecretData): Promise<ITokenData> {
//   const dpopKey = await generateDpopKeyPair();
//   const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
//   const tokenUrl = 'http://localhost:3001/.oidc/token';
//   const accessToken = await fetch(tokenUrl, {
//     method: 'POST',
//     headers: {
//       // The header needs to be in base64 encoding.
//       authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
//       'content-type': 'application/x-www-form-urlencoded',
//       dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
//     },
//     body: 'grant_type=client_credentials&scope=webid',
//   })
//     .then(res => res.json())
//     .then(res => res.access_token);

//   return { accessToken, dpopKey };
// }

// describe('System test: QuerySparql over Solid Pods', () => {
//   let app: App;
//   let secret: ISecretData;
//   let token: ITokenData;
//   let authFetch: typeof fetch;

//   beforeEach(() => {
//     engine = new QueryEngine();
//   });

//   beforeAll(async() => {
//     // Start up the server
//     app = await createApp();
//     await app.start();

//     // Generate secret
//     secret = await getSecret();

//     // Get token
//     token = await refreshToken(secret);

//     // Build authenticated fetch
//     authFetch = <any> await buildAuthenticatedFetch(<any>fetch, token.accessToken, { dpopKey: token.dpopKey });

//     // Override global fetch with auth fetch
//     // @ts-expect-error
//     // eslint-disable-next-line no-undef
//     globalThis.fetch = jest.fn(authFetch);
//   });

//   afterAll(async() => {
//     await app.stop();

//     // Reset global fetch. This is probably redundant, as jest clears the DOM after each file.
//     // eslint-disable-next-line no-undef
//     globalThis.fetch = globalFetch;
//   });

//   describe('Querying data from a Pod', () => {
//     let resource: string;
//     let i = 0;

//     describe('A single resource containing <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1>', () => {
//       // Create a new file in the Pod
//       beforeEach(async() => {
//         resource = `http://localhost:3001/${config[0].podName}/myContainer/myFile-${i++}.ttl`;
//         // Create test.ttl (did not exist before)
//         await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1> }`, {
//           sources: [ resource ],
//           destination: resource,
//         });
//       });

//       it('Should return 2 quads from resource', async() => {
//         // Get data in resource file
//         const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
//           sources: [ resource ],
//         }).then(res => res.toArray());
//         expect(quads).toBeRdfIsomorphic([
//           squad('ex:s', 'ex:p', 'ex:o1'),
//           squad('ex:s', 'ex:p', 'ex:o1.1'),
//         ]);
//       });

//       it('Should return 1 quads from when doing more restricted query', async() => {
//         // Get data in resource file
//         const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
//           sources: [ resource ],
//         }).then(res => res.toArray());

//         expect(quads).toBeRdfIsomorphic([
//           squad('ex:s', 'ex:p', 1),
//         ]);
//       });

//       it('Should return 2 quads from resource [Link Recovery Enabled]', async() => {
//         // Get data in resource file
//         const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
//           sources: [ resource ],
//           recoverBrokenLinks: true,
//         }).then(res => res.toArray());

//         expect(quads).toBeRdfIsomorphic([
//           squad('ex:s', 'ex:p', 'ex:o1'),
//           squad('ex:s', 'ex:p', 'ex:o1.1'),
//         ]);
//       });

//       it('Should return 1 quads from when doing more restricted query [Link Recovery Enabled]', async() => {
//         // Get data in resource file
//         const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
//           sources: [ resource ],
//           recoverBrokenLinks: true,
//         }).then(res => res.toArray());

//         expect(quads).toBeRdfIsomorphic([
//           squad('ex:s', 'ex:p', 1),
//         ]);
//       });
//     });

//     describe('A single resource containing <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1> [linkRecovery: true]',
//       () => {
//       // Create a new file in the Pod
//         beforeEach(async() => {
//           resource = `http://localhost:3001/${config[0].podName}/myContainer/myFile-${i++}.ttl`;
//           // Create test.ttl (did not exist before)
//           await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1> }`, {
//             sources: [ resource ],
//             destination: resource,
//             recoverBrokenLinks: true,
//           });
//         });

//         it('Should return 2 quads from resource', async() => {
//         // Get data in resource file
//           const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
//             sources: [ resource ],
//           }).then(res => res.toArray());

//           expect(quads).toBeRdfIsomorphic([
//             squad('ex:s', 'ex:p', 'ex:o1'),
//             squad('ex:s', 'ex:p', 'ex:o1.1'),
//           ]);
//         });

//         it('Should return 1 quads from when doing more restricted query', async() => {
//         // Get data in resource file
//           const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
//             sources: [ resource ],
//           }).then(res => res.toArray());

//           expect(quads).toBeRdfIsomorphic([
//             squad('ex:s', 'ex:p', 1),
//           ]);
//         });

//         it('Should return 2 quads from resource [Link Recovery Enabled]', async() => {
//         // Get data in resource file
//           const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
//             sources: [ resource ],
//             recoverBrokenLinks: true,
//           }).then(res => res.toArray());

//           expect(quads).toBeRdfIsomorphic([
//             squad('ex:s', 'ex:p', 'ex:o1'),
//             squad('ex:s', 'ex:p', 'ex:o1.1'),
//           ]);
//         });

//         it('Should return 1 quads from when doing more restricted query [Link Recovery Enabled]', async() => {
//         // Get data in resource file
//           const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
//             sources: [ resource ],
//             recoverBrokenLinks: true,
//           }).then(res => res.toArray());

//           expect(quads).toBeRdfIsomorphic([
//             squad('ex:s', 'ex:p', 1),
//           ]);
//         });
//       });

//     // TODO: Enable this once https://github.com/comunica/comunica-feature-solid/issues/43 is solved
//     // eslint-disable-next-line mocha/no-skipped-tests
//     describe.skip('A single resource containing <ex:s> <ex:p> <ex:o1> after deletion', () => {
//       // Create a new file in the Pod
//       beforeEach(async() => {
//         resource = `http://localhost:3001/${config[0].podName}/myContainer/myFile-${i++}.ttl`;
//         // Create test.ttl (did not exist before)
//         await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1> }`, {
//           sources: [ resource ],
//           destination: resource,
//         });
//         await engine.queryVoid(`DELETE DATA { <ex:s> <ex:p> <ex:o1.1> }`, {
//           sources: [ resource ],
//           destination: resource,
//         });
//       });

//       it('Should return 1 quads from resource', async() => {
//         // Get data in resource file
//         const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
//           sources: [ resource ],
//         }).then(res => res.toArray());
//         expect(quads).toBeRdfIsomorphic([
//           squad('ex:s', 'ex:p', 1),
//         ]);
//       });

//       it('Should return 0 quads from when doing more restricted query', async() => {
//         // Get data in resource file
//         const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
//           sources: [ resource ],
//         }).then(res => res.toArray());
//         expect(quads).toHaveLength(0);
//       });
//     });

//     describe('A single resource containing <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1> inserted separately', () => {
//       // Create a new file in the Pod
//       beforeEach(async() => {
//         resource = `http://localhost:3001/${config[0].podName}/myContainer/myFile-${i++}.ttl`;
//         // Create test.ttl (did not exist before)
//         await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p> <ex:o1> }`, {
//           sources: [ resource ],
//           destination: resource,
//         });

//         await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p> <ex:o1.1> }`, {
//           sources: [ resource ],
//           destination: resource,
//         });
//       });

//       // TODO: Enable this when https://github.com/comunica/comunica-feature-solid/issues/43 is closed
//       // eslint-disable-next-line mocha/no-skipped-tests
//       it.skip('Should return 2 quads from resource', async() => {
//         // Get data in resource file
//         const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
//           sources: [ resource ],
//         }).then(res => res.toArray());

//         expect(quads).toBeRdfIsomorphic([
//           squad('ex:s', 'ex:p', 'ex:o1'),
//           squad('ex:s', 'ex:p', 'ex:o1.1'),
//         ]);
//       });

//       it('Should return 1 quads from when doing more restricted query', async() => {
//         // Get data in resource file
//         const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
//           sources: [ resource ],
//         }).then(res => res.toArray());

//         expect(quads).toBeRdfIsomorphic([
//           squad('ex:s', 'ex:p', 1),
//         ]);
//       });
//     });
//   });
// });
