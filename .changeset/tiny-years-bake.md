---
'@evervault/sdk': minor
---

Extend Relay outbound/forward proxy support in Node to include the ability to filter requests by path using `decryptionDomains`.

Requests can be filtered at the path level by appending an absolute or wildcard path to the decryption domains option, following similar wildcard logic to the domains
themselves. For example:

```js
// Existing behaviour will be observed, proxying requests to the host 'api.com'.
const ev = new Evervault('app_uuid', 'api_key', {
  decryptionDomains: ['api.com']
});

// Will only proxy requests to host 'api.com' which have a path starting with '/users/'.
const ev = new Evervault('app_uuid', 'api_key', {
  decryptionDomains: ['api.com/users/*']
});

// Will only proxy requests to host 'api.com' which have an exact path of '/settings'.
const ev = new Evervault('app_uuid', 'api_key', {
  decryptionDomains: ['api.com/settings']
});
```

This change is compatible with the existing hostname wildcard behaviour of `decryptionDomains`.