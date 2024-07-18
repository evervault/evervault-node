# @evervault/sdk

## 6.2.0

### Minor Changes

- 1d40263: Encrypt with just app id

## 6.1.0

### Minor Changes

- 14748f9: Replace ASN.1 encoding library
- f3db4d3: Added `createEnclaveHttpsAgent` to return an `EnclaveAgent` class which extends https.Agent to manage HTTPS connections. This Agent can be passed into HTTP clients like Axios to attest a connection to an Enclave.

### Patch Changes

- ca97124: remove unused code

## 6.0.1

### Patch Changes

- bfd870a: Remove support for data policies when encrypting Files

## 6.0.0

### Major Changes

- 0feef7d: The Evervault Attestation Bindings have been removed as an external dependency including them instead as a plugin at runtime.

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
  await evervault.enableEnclaves(
    {
      'my-enclave': {
        // attestation measures...
      },
    },
    attestationBindings
  );
  ```

## 5.1.6

### Patch Changes

- 5ffb2ba: Declare helper functions in pcrManager as consts.

## 5.1.5

### Patch Changes

- d0c277c: Correct validation of PCR data given to enableEnclaves - allow for functions to be passed as values in the map.
- 73464ab: Make polling jobs scheduled by the SDK headless to allow processes to exit cleanly.

## 5.1.4

### Patch Changes

- e1624e0: Add enclaves hostname to attestationListener

## 5.1.3

### Patch Changes

- c3208ff: Fix bug with incorrect config being passed to PcrManager constructor

## 5.1.2

### Patch Changes

- 3cb052a: Fix bug resulting in undefined reference within the AttestationDoc Cache when using the enableEnclaves entrypoint.

## 5.1.1

### Patch Changes

- 942f0e6: Update typings to include new enableEnclaves function.

## 5.1.0

### Minor Changes

- 6baff50: Add new enableEnclaves function and deprecate enableCages

## 5.0.0

### Major Changes

- 172eb04: Deprecating intercept and ignore domains

  You can now use the `enableOutboundRelay()` method to enable outbound relay. For more details check out https://docs.evervault.com/sdks/nodejs#enableoutboundrelay()

- e42fddd: Simplifying errors thrown by the SDK.

  Previously we exposed many different error types for users to handle, but in most cases these errors were not something that could be caught and handled, but were rather indicative of a larger configuration issue. This change simplifies the errors thrown by returning an EvervaultError with accompanying error message by default, unless they are a transient error which can be handled programmatically, in which case a specific error is returned.

- d03a72e: We have released a new API for Function run requests which is more robust, more extensible, and which provides more useful error messages when Function runs fail. This change migrates all Function run requests to the new API. In addition, we have removed the `encryptAndRun` method, async Function run requests, and specifying version of Function to run. For more details check out https://docs.evervault.com/sdks/nodejs#run()

### Minor Changes

- dc30edd: The `encrypt` function has been enhanced to accept an optional Data Role. This role, once specified, is associated with the data upon encryption. Data Roles can be created in the Evervault Dashboard (Data Roles section) and provide a mechanism for setting clear rules that dictate how and when data, tagged with that role, can be decrypted. For more details check out https://docs.evervault.com/sdks/nodejs#encrypt()

  `evervault.encrypt('hello world!', 'allow-all');`

- 4ea79de: Add support for using Data Roles when encrypting files with the `encrypt` function.
- 72d6786: Cage PCR Provider: publish new PCRs to public source which SDKs can pull from for attestation

### Patch Changes

- d4a1a87: We were duplicating information from our documentation on our website into the README. Instead, we now have a single source of truth

## 4.3.0

### Minor Changes

- 6e7c03f: Updated attestation for Cages GA
