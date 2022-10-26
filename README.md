[![Evervault](https://evervault.com/evervault.svg)](https://evervault.com/)

# Evervault Node.js SDK

The [Evervault](https://evervault.com) Node.js SDK is a toolkit for encrypting data as it enters your server, and working with Cages. By default, initializing the SDK will result in all outbound HTTPS requests being intercepted and decrypted.

## Getting Started

Before starting with the Evervault Node.js SDK, you will need to [create an account](https://app.evervault.com/register) and a team.

For full installation support, [book time here](https://calendly.com/evervault/cages-onboarding).

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

// Initialize the client with your team's api key
const evervaultClient = new Evervault('<API-KEY>');

// Encrypt your sensitive data
const encrypted = await evervaultClient.encrypt({ ssn: '012-34-5678' });

// Process the encrypted data in a Cage
const result = await evervaultClient.run('<CAGE_NAME>', encrypted);
```

## Reference

The Evervault Node.js SDK exposes three functions.

### evervault.encrypt()

`evervault.encrypt()`encrypts data for use in your [Cages](https://docs.evervault.com/tutorial). To encrypt data at the server, simply pass an object or string into the evervault.encrypt() function. Store the encrypted data in your database as normal.

```javascript
async evervault.encrypt(data: Object | String);
```

| Parameter | Type             | Description           |
| --------- | ---------------- | --------------------- |
| data      | Object or String | Data to be encrypted. |

### evervault.run()

`evervault.run()` invokes a Cage with a given payload.

```javascript
async evervault.run(cageName: String, payload: Object[, options: Object]);
```

| Parameter | Type   | Description                                   |
| --------- | ------ | --------------------------------------------- |
| cageName  | String | Name of the Cage to be run                    |
| data      | Object | Payload for the Cage                          |
| options   | Object | [Options for the Cage run](#Cage-Run-Options) |

#### Cage Run Options

Options to control how your Cage is run

| Option  | Type    | Default   | Description                                                                          |
| ------- | ------- | --------- | ------------------------------------------------------------------------------------ |
| async   | Boolean | false     | Run your Cage in async mode. Async Cage runs will be queued for processing.          |
| version | Number  | undefined | Specify the version of your Cage to run. By default, the latest version will be run. |

### Enable Outbound Relay for specific domains

Outbound Relay will decrypt any Evervault encrypted data sent to a domain that is configured as an Outbound Relay Destination in the [UI](https://app.evervault.com). Setting the `enableOutboundRelay` option to `true` will enable and sync your Outbound Relay destinations with the SDK.

```javascript
const evervaultClient = new Evervault('<API-KEY>', {
  enableOutboundRelay: true
});
```

### evervault.createRunToken()

`evervault.createRunToken()` creates a single use, time bound token for invoking a cage.

```javascript
async evervault.createRunToken(cageName: String, payload: Object);
```

| Parameter | Type   | Description                                          |
| --------- | ------ | ---------------------------------------------------- |
| cageName  | String | Name of the Cage the run token should be created for |
| data      | Object | Payload that the token can be used with              |

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/evervault/evervault-node.

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## Feedback

Questions or feedback? [Let us know](mailto:support@evervault.com).
