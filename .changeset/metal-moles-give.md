---
'@evervault/sdk': minor
---

Added `createEnclaveHttpsAgent` to return an `EnclaveAgent` class which extends https.Agent to manage HTTPS connections. This Agent can be passed into HTTP clients like Axios to attest a connection to an Enclave.
