---
'@evervault/sdk': major
---

Rewrite the SDK in TypeScript. The package now ships a compiled `dist/` bundle with dual ESM and CommonJS entry points plus bundled type declarations (built with `tsup`), replacing the previously shipped JavaScript source and the `tsc`-generated `types/` directory.

The public API is unchanged: `require('@evervault/sdk')` still returns the `EvervaultClient` class, `import Evervault from '@evervault/sdk'` works for ESM consumers, and every client method keeps the same signature and runtime behaviour (including the on-the-wire encryption formats). This is released as a major version only because the package's internal file layout and `exports` map changed, which can affect consumers that imported internal file paths directly.

Type declarations are resolved per export condition: CommonJS consumers get `export = EvervaultClient` (matching the `module.exports = EvervaultClient` runtime), and ESM consumers get a default export. This keeps `new Evervault(...)` type-checking for plain JavaScript consumers using `// @ts-check` or editor IntelliSense.

Remove unused internal modules (`labs`, `dataHelper`, `environment`) and their dead dependency reference (`big.js` was imported but never installed). Move test-only dependencies `crc-32` to `devDependencies`. Removed dependency on uuid.
