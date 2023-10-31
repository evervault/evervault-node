[![Evervault](https://evervault.com/evervault.svg)](https://evervault.com/)

# Evervault Node.js SDK

The [Evervault](https://evervault.com) Node.js SDK is a toolkit for encrypting data as it enters your server, and working with Functions. By default, initializing the SDK will result in all outbound HTTPS requests being intercepted and decrypted.

## Getting Started

Before starting with the Evervault Node.js SDK, you will need to [create an account](https://app.evervault.com/register) and a team.

For full installation support, [book time here](https://calendly.com/evervault/support).

## Documentation

See the Evervault [Node.js SDK documentation](https://docs.evervault.com/sdk/nodejs).

## Installation

Our Node.js SDK is distributed via [npm](https://www.npmjs.com/package/@evervault/sdk), and can be installed using your preferred package manager.

```sh
npm install --save @evervault/sdk

yarn add @evervault/sdk
```

## Setup

To make Evervault available for use in your app:

```js
const Evervault = require('@evervault/sdk');

// Initialize the client with your App ID and API Key
const evervaultClient = new Evervault('<APP_ID>', '<API_KEY>');

// Encrypt your sensitive data
const encrypted = await evervaultClient.encrypt({ ssn: '012-34-5678' });

// Process the encrypted data in a Function
const result = await evervaultClient.run('<FUNCTION_NAME>', encrypted);

// Send the decrypted data to a third-party API
await evervaultClient.enableOutboundRelay();
const response = await axios.post('https://example.com', encrypted);

// Use HTTPSProxyAgent to send data to a third-party
const httpsAgent = evervault.createRelayHttpsAgent();
const response = await axios.get('https://example.com', {
  httpsAgent,
});

// Decrypt the data
const decrypted = await evervaultClient.decrypt(encrypted);

// Enable the Cages client
await evervaultClient.enableCages({ 'my-cage': { pcr8: '...' } });
const response = await axios.post(
  'https://my-cage.my-app.cages.evervault.com',
  encrypted
); // This connection will be attested by the Cages client
```

## Reference

The Evervault Node.js SDK exposes six functions.

### evervault.encrypt()

`evervault.encrypt()` encrypts data. To encrypt data at the server, simply pass a string, boolean, number, array, object or buffer into the `evervault.encrypt()` function. Store the encrypted data in your database as normal.

```javascript
async evervault.encrypt(data: string | boolean | number | Array | Object | Buffer);
```

| Parameter | Type                                             | Description           |
| --------- | ------------------------------------------------ | --------------------- |
| data      | String, Boolean, Number, Array, Object or String | Data to be encrypted. |

### evervault.decrypt()

`evervault.decrypt()` decrypts data previously encrypted with the `encrypt()` function or through Evervault's Relay (Evervault's encryption proxy).
An API Key with the `decrypt` permission must be used to perform this operation.

```javascript
async evervault.decrypt(encrypted: string | Array | Object | Buffer);
```

| Parameter | Type                            | Description           |
| --------- | ------------------------------- | --------------------- |
| encrypted | String, Array, Object or Buffer | Data to be decrypted. |

### evervault.createClientSideDecryptToken()

`evervault.createClientSideDecryptToken()` creates a token that can be used to authenticate a `decrypt()` request
from a frontend/client application.
An API Key with the `Create Token` permission must be used to perform this operation.

```javascript
async evervault.createClientSideDecryptToken(payload: string | Array | Object, expiry: Date);
```

| Parameter | Type                     | Description                                                           |
| --------- | ------------------------ | --------------------------------------------------------------------- |
| payload   | String, Array, or Object | Data that the token can decrypt.                                      |
| expiry    | Date                     | The expiry of the token, must be < 10 mins from now. (Default 5 mins) |

### evervault.run()

`evervault.run()` invokes a Function with a given payload.
An API Key with the `run function` permission must be used to perform this operation.

```javascript
async evervault.run(functionName: String, payload: Object[, options: Object]);
```

| Parameter    | Type   | Description                                           |
| ------------ | ------ | ----------------------------------------------------- |
| functionName | String | Name of the Function to be run                        |
| data         | Object | Payload for the Function                              |
| options      | Object | [Options for the Function run](#Function-Run-Options) |

#### Function Run Options

Options to control how your Function is run

| Option  | Type    | Default   | Description                                                                              |
| ------- | ------- | --------- | ---------------------------------------------------------------------------------------- |
| async   | Boolean | false     | Run your Function in async mode. Async Function runs will be queued for processing.      |
| version | Number  | undefined | Specify the version of your Function to run. By default, the latest version will be run. |

### evervault.createRunToken()

`evervault.createRunToken()` creates a single use, time bound token for invoking a Function.
An API Key with the `create a run token` permission must be used to perform this operation.

```javascript
async evervault.createRunToken(functionName: String, payload: Object);
```

| Parameter    | Type   | Description                                              |
| ------------ | ------ | -------------------------------------------------------- |
| functionName | String | Name of the Function the run token should be created for |
| data         | Object | Payload that the token can be used with                  |

### evervault.enableOutboundRelay()

`evervault.enableOutboundRelay()` configures your application to proxy HTTP requests using Outbound Relay based on the configuration created in the Evervault dashboard. See [Outbound Relay](https://docs.evervault.com/concepts/outbound-relay/overview) to learn more.

```javascript
async evervault.enableOutboundRelay([options: Object])
```

| Option              | Type      | Default     | Description                                                                                                                                                 |
| ------------------- | --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `decryptionDomains` | `Array`   | `undefined` | Requests sent to any of the domains listed will be proxied through Outbound Relay. This will override the configuration created in the Evervault dashboard. |
| `debugRequests`     | `Boolean` | `False`     | Output request domains and whether they were sent through Outbound Relay.                                                                                   |

### evervault.createRelayHttpsAgent()

`evervault.createRelayHttpsAgent()` will return a `HttpsProxyAgent` configred to proxy traffic through Relay.

```javascript
evervault.createRelayHttpsAgent();
```

#### createRelayHttpsAgent axios example

```javascript
const httpsAgent = evervault.createRelayHttpsAgent();
const response = await axios.get('https://example.com', {
  httpsAgent,
});
```

### evervault.enableCages()

`evervault.enableCages()` configures your client to automatically attest any requests to Cages. See the [Cage attestation docs](https://docs.evervault.com/products/cages#how-does-attestation-work-with-cages) to learn more.

```javascript
async evervault.enableCages([cageAttestationData: Object])
```

| Key          | Type             | Default     | Description                                                                                                                                                                                                                                                                          |
| ------------ | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<CageName>` | `Object` `Array` `Function` | `undefined` | Requests to a Cage specified in this object will include a check to verify that the PCRs provided in the object are included in the attestation document. The provided data can be either a single Object, an Array of Objects or a function which returns a promise of an array of Objects. |

#### PCR Management

There are two ways to provider PCRs for attestation.

1. *Static PCRs*: Set either a single PCR object or an array of multiple PCR objects.
2. *PCR Providers*: Instead of statically setting PCRs, you can define a PCR provider. This is a function that returns a Promise resolving to an array of PCR objects. By default, the system will poll this provider every 5 minutes for updates, but this interval can be customized using the EV_PCR_PROVIDER_POLL_INTERVAL environment variable. This method allows you to publish your PCRs from CI to a public endpoint, enabling all clients to fetch updates automatically.

#### Example Workflow for Deployment with PCRs:

When deploying, two sets of PCRs may be returned due to gradual rollouts. Here's a suggested workflow for publishing PCRs in your CI:

1. Execute the ev-cage build command to build the cage.
2. Retrieve the PCRs from the built cage. Your provider should serve both the existing and new PCRs.
3. Deploy the EIF from the build.
4. After a successful deployment, it's safe to remove the older PCRs from the provider.

#### Cages Example

```javascript
//With hardcoded PCRs
await evervault.enableCages({
  'hello-cage': {
    pcr8: '97c5395a83c0d6a04d53ff962663c714c178c24500bf97f78456ed3721d922cf3f940614da4bb90107c439bc4a1443ca',
  },
});
```

```javascript
  // With PCR provider
  // Provider Returns: 
  // [{
  // "pcr0": "97c5395a83c0d6a04d53ff962663c714c178c24500bf97f78456ed3721d922cf3f940614da4bb90107c439bc4a1443ca",
  // etc...
  //}] 
  pcrProvider = async () => {
    const {data: pcrs} = await axios.get("https://my-pcr-provider.example.com/hello-cage");
    return pcrs
  }

  //PCR provider will be polled every five minutes to attest with the latest PCRS. 
  await evervault.enableCages({
    'hello-cage': pcrProvider
  });

```

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/evervault/evervault-node.

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## Feedback

Questions or feedback? [Let us know](mailto:support@evervault.com).
