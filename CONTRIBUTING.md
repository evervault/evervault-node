[![Evervault](https://evervault.com/evervault.svg)](https://evervault.com/)

# Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/evervault/evervault-node.

## Getting Started

To make life easier, this module features a code formatter/linter.

This repo uses [pnpm](https://pnpm.io/) as its package manager. If you have [Nix](https://nixos.org/) installed, `nix develop` will drop you into a shell with the correct Node.js and pnpm versions. Otherwise, install pnpm via [Corepack](https://pnpm.io/installation#using-corepack) (`corepack enable pnpm`), which will pick up the pinned version from the `packageManager` field in `package.json`.

You will first need to install all of the dependencies with

```shell
pnpm install
```

after that is done, there are git hooks which need to be installed using [husky](https://github.com/typicode/husky), which can be done through

```shell
pnpm run prepare
```

We use one hook: `pre-commit`.

## Code Formatting

The `pre-commit` hook ensures that code is formatted correctly. We use [prettier](https://prettier.io/) for code formatting automatically, and if you want you can see the configuration in the `.prettierrc` file.

It should be possible to configure your editor to run prettier on save, which should make your life easier - have a look at [editor support](https://prettier.io/docs/en/editors.html).

There is a test that is run whenever a pull request is made (`pnpm run format`), so please ensure that your code is formatted correctly before committing!

## Commit Formatting & Releases

We use [changesets](https://github.com/changesets/changesets) to version manage in this repo.

When creating a pr that needs to be rolled into a version release, do `pnpm exec changeset`, select the level of the version bump required and describe the changes for the change logs. DO NOT select major for releasing breaking changes without team approval.

To release:

Merge the version PR that the changeset bot created to bump the version numbers. This will bump the versions of the packages, create a git tag for the release, and release the new version to npm.