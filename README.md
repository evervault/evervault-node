# evervault node sdk

The Node.js SDK for working with evervault cages.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Setup](#setup)
- [API Reference](#api-reference)
    - [evervaultClient.encrypt](#evervaultclientencrypt)
    - [evervaultClient.run](#evervaultclientrun)
    - [evervaultClient.encryptAndRun](#evervaultclientencryptandrun)
    - [Encryption Options](#encryption-options)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Getting Started

#### Prerequisites

To get started with the evervault Node.js SDK, you will need to have created a team on the evervault dashboard.

We are currently in invite-only early access. You can apply for early access [here](https://evervault.com).

#### Installation

```sh
npm install --save @evervault/sdk

yarn add @evervault/sdk
```

#### Setup

```js
const Evervault = require('@evervault/sdk');

// Initialize the client with your team's api key
const evervaultClient = new Evervault(<API-KEY>);

// Encrypt your data and run a cage
const result = await evervaultClient.encryptAndRun(<CAGE-NAME>, { hello: 'World!' });
```

## API Reference

#### evervaultClient.encrypt

Encrypt lets you encrypt data for use in any of your evervault cages. You can use it to store encrypted data to be used in a cage at another time.

```javascript
async evervaultClient.encrypt(data: Object | String, options?: Object);
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| data | Object or String | Data to be encrypted |
| options | Object | [Standard evervault encryption options](#Encryption-Options) |

#### evervaultClient.run

Run lets you invoke your evervault cages with a given payload.

```javascript
async evervaultClient.run(cageName: String, payload: Object);
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| cageName | String | Name of the cage to be run |
| data | Object | Payload for the cage |

#### evervaultClient.encryptAndRun

Encrypt your data and use it as the payload to invoke the cage.

```javascript
async evervaultClient.encryptAndRun(cageName: String, data: Object, options: Object);
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| cageName | String | Name of the cage to be run |
| data | Object | Data to be encrypted |
| options | Object | [Standard evervault encryption options](#Encryption-Options) |

#### Encryption Options

Options to control how your data is encrypted.

| Option | Default | Description |
| --------- | ---- | ----------- |
| fieldsToEncrypt | All keys | If the data is an object, fieldsToEncrypt specifies the keys to encrypt. |
