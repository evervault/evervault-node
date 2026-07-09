---
"@evervault/sdk": patch
---

Remove unused internal modules (`labs`, `dataHelper`, `environment`) and their dead dependency reference (`big.js` was imported but never installed). Move test-only dependencies `crc-32` and `uuid` to `devDependencies`.
