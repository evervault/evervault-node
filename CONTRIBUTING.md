[![Evervault](https://evervault.com/evervault.svg)](https://evervault.com/)

# Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/evervault/evervault-node.

## Getting Started

To make life easier, this module features a code formatter/linter and also a commit formatter/linter, so that our
releases will be compatible with [semantic release](https://semantic-release.gitbook.io/semantic-release/).

You will first need to install all of the dependencies with

```shell
npm install
```

after that is done, there are git hooks which need to be installed using [husky](https://github.com/typicode/husky), which can be done through

```shell
npm run prepare
```

We use three different hooks: `commit-msg`, `pre-commit` and `prepare-commit-msg`.

## Code Formatting

The `pre-commit` hook ensures that code is formatted correctly. We use [prettier](https://prettier.io/) for code formatting automatically, and if you want you can see the configuration in the `.prettierrc` file.

It should be possible to configure your editor to run prettier on save, which should make your life easier - have a look at [editor support](https://prettier.io/docs/en/editors.html).

There is a test that is run whenever a pull request is made (`npm run lint`), so please ensure that your code is formatted correctly before committing!

## Commit Formatting & Releases

To maintain compatibility with [semantic versioning](https://semver.org/), we use a combination of commit formatting and [semantic release](https://github.com/semantic-release/semantic-release).

When you run `git commit`, you will be presented with [commitizen](https://github.com/commitizen/cz-cli), which will interactively run through the generation of a standardized commit message. Please follow this format because it ensures that changes will be well reflected in versioning. There is also a lint run on commits to ensure they are the correct style.

We use the commit style specified in [conventional commits](https://www.conventionalcommits.org/).
