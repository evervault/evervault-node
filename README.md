[![Evervault](https://evervault.com/evervault.svg)](https://evervault.com/)

# Evervault Node.js SDK

The [Evervault](https://evervault.com) Node.js SDK is a toolkit for encrypting data as it enters your server, and working with Cages.

## Getting Started

Before starting with the Evervault Node.js SDK, you will need to [create an account](https://app.evervault.com/register) and a team.

For full installation support, [book time here](https://calendly.com/evervault/cages-onboarding).

## Documentation

See the Evervault [Node.js SDK documentation](https://docs.evervault.com/sdk/nodejs).

## Installation

Our Node.js SDK is distributed via [npm](https://www.npmjs.com/), and can be installed using your preferred package manager.

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

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| data | Object or String | Data to be encrypted. |

### evervault.run()

`evervault.run()` invokes a Cage with a given payload.

```javascript
async evervault.run(cageName: String, payload: Object[, options: Object]);
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| cageName | String | Name of the Cage to be run |
| data | Object | Payload for the Cage |
| options | Object | [Options for the Cage run](#Cage-Run-Options) |

#### Cage Run Options

Options to control how your Cage is run

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| async | Boolean | false | Run your Cage in async mode. Async Cage runs will be queued for processing. |
| version | Number | undefined | Specify the version of your Cage to run. By default, the latest version will be run. |

### evervault.cagify()

`evervault.cagify()` lets you deploy and run ordinary Node.js functions as Cages, inline.

This function will automatically deploy a function as a Cage and return a native async Node.js function that accepts the original parameters, but which invokes a Cage when run.

**Note:** `evervault.cagify()` is a synchronous function and will block your event loop if no cage-lock.json file is present for the Caged functions.

```javascript
evervault.cagify(cageName: String, cageFunction: Function);
```
| Parameter | Type | Description |
| --------- | ---- | ----------- |
| cageName | String | Name of the Cage to be run |
| cageFunction | Function | The function to deploy as a Cage |

### Disable Relay interception on requests to specfic domains

You may pass in an array of domains which you **don't** want to be intercepted by Relay, i.e. requests sent to these domains will not go through Relay, and hence will not be decrypted. This array is passed in the `ignoreDomains` option.

```javascript
const evervaultClient = new Evervault('<API-KEY>', { ignoreDomains: ['httpbin.org', 'facebook.com'] });
// Requests sent to URLs such as https://httpbin.org/post or https://api.facebook.com will not be sent through Relay
```

### Disable Relay interception on all requests

To disable all outbound requests being decrypted, you may set the `intercept` option to `false` when initializing the SDK. 

```javascript
const evervault = new Evervault('<API-KEY>', { intercept: false });
```

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/evervault/evervault-node.

## Feedback

Questions or feedback? [Let us know](mailto:support@evervault.com).
