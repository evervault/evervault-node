# evervault node sdk

## About

Encrypt data and run cages from your node environment.

## Initialize the sdk
```js
const evervault = require('evervault-node-sdk').init(yourAPIKey);

const cageResult = evervault.encryptAndRun('your-cage-name', 
  { secret: 'data' },
  { preserveObjectShape: true }
);
```

Providing your team's api key to the init function of the sdk returns the encrypt, run, and encryptAndRun functions.

## API Reference

### init
```js
evervault.init(yourApiKey): object
```
Param | Type | Description
------|------|------------
yourApiKey | `string` | Your team's api key

-------
### encrypt
```js
evervault.encrypt(cageName, data[, options]): Promise<object | string>
```
Param | Type | Description
------|------|------------
cageName | `string` | The name of the cage that you are encrypting data for
data | `any` | The data to be encrypted
options | `object` | [The encryption options](#encryption-options)
----------
### encryption options

Option | Type | Description
-------|------|------------
preserveObjectShape | `boolean` | If the data to encrypt is an object and `preserveObjectShape` is true, only the objects values wll be encrypted. If false, the entire object will be encrypted.
fieldsToEncrypt | `string[]` | If the data to encrypt is an object and `preserveObjectShape` is true, only the values specified in `fieldsToEncrypt` will be encrypted. If undefined, all values will be encrypted.
------------
### run
```js
evervault.run(cageName, data): Promise<object>
```
Param | Type | Description
------|------|------------
cageName | `string` | The name of the cage to run
data | `object | string` | The data to be sent to the cage

### encryptAndRun
```js
evervault.encryptAndRun(cageName, data, options): Promise<object>
```
Param | Type | Description
------|------|------------
cageName | `string` | The name of the cage to run with the encrypted data
data | `any` | The data to encrypt and send to the cage
options | `object` | [The encryption options](#encryption-options)