# Evervault Node SDK

The Node.js SDK for working with Evervault cages.

### Prerequisites

To get started with the Evervault Node.js SDK, you will need to have created a team on the Evervault dashboard.

We are currently in invite-only early access. You can apply for early access [here](https://evervault.com).

### Installation

```sh
npm install --save @evervault/sdk

yarn add @evervault/sdk
```

### Setup

```js
const Evervault = require('@evervault/sdk');

// Initialize the client with your team's api key
const evervaultClient = new Evervault('<API-KEY>');

// Encrypt your sensitive data
const encrypted = await evervaultClient.encrypt({ ssn: '012-34-5678' });

// Process the encrypted data in a Cage
const result = await evervaultClient.run('<CAGE_NAME>', encrypted);
```

## API Reference

### evervaultClient.encrypt

Encrypt lets you encrypt data for use in any of your Evervault Cages. You can use it to store encrypted data to be used in a Cage at another time.

```javascript
async evervaultClient.encrypt(data: Object | String);
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| data | Object or String | Data to be encrypted |

### evervaultClient.run

Run lets you invoke your Evervault cages with a given payload.

```javascript
async evervaultClient.run(cageName: String, payload: Object, options?: Object);
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| cageName | String | Name of the Cage to be run |
| data | Object | Payload for the Cage |
| options | Object | [Options for the Cage run](#Cage-Run-Options) |

#### Cage Run Options

Options to control how your Cage is run

| Option | Default | Description |
| ------ | ------- | ----------- |
| async | false | Run your Cage in async mode. Cage runs will be queued and processed asynchronously. |
| version | undefined | Specify the version of your Cage to run. By default, the latest version will be run. |

### evervaultClient.encryptAndRun

Encrypt your data and use it as the payload to invoke the Cage.

```javascript
async evervaultClient.encryptAndRun(cageName: String, data: Object, options?: Object);
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| cageName | String | Name of the cage to be run |
| data | Object | Data to be encrypted |
| options | Object | [Options for the Cage run](#Cage-Run-Options) |
