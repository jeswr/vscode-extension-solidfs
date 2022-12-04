# solidfs README

Provides the [file based view](https://github.com/solidLabResearch/whatsInAPod) on a Solid Pod directly from vscode.

:warning: This is a pre-alpha version. Changes can occur at any time

![](./usage.webm)

## Features

Log into a pod using the `SolidFS: Log In` command and enter the url of the Pod provider.

After logging in and retrieving the Pod root, your editor will add your Pod storage as a folder in your editor.
Currently we support the following operations:

- Open directories (containers)
- Open files (resources)
- Delete files (resources)
- Create files (resources) - if created with a `.ttl` extension the resource will be given a content type of `text/turtle`, if given an extension of `.jsonld` the resource will be given a content type of `application/ld+json`. Otherwise the files will be given a content type of `application/octet-stream`
- Modify files (resources) - note that modified files will keep the same content type as the original file

## Known Issues

We are yet to implement the following:

- Delete directories (containers)
- Rename files / directories
- Copy files / directories
- Edit / view permissions and metadata

We do not clear information about old sessions automatically. If you start to have problems logging in try running `SolidFS: Clear`.

This extension has been tested against CSS v5 and ESS v2.0; these tests are not thorough (for now).

## Release Notes

### 0.0.1

Initial release of SolidFS

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

**Enjoy!**
