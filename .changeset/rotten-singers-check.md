---
'@evervault/sdk': major
---

The Evervault Attestation Bindings have been removed as an external dependency including them instead as a plugin at runtime.

The attestation bindings now require an explicit opt-in. For customers that do not use Evervault Enclaves, there should be no change to how you use the SDK.

If you use Evervault Enclaves, you'll need to install the Attestation Bindings separately:

```sh
npm i @evervault/attestation-bindings
```

After installing the attestation bindings, you can use the existing `enableEnclaves` function using the bindings as the second parameter:

```javascript
const Evervault = require('@evervault/sdk');
const attestationBindings = require('@evervault/attestation-bindings');

const evervault = new Evervault('app_id', 'api_key');
await evervault.enableEnclaves({
  'my-enclave': {
    // attestation measures...
  }
}, attestationBindings);
```