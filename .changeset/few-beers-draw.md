---
"@evervault/sdk": patch
---

Correct logic for parsing domains from URLs supplied to the http request function: add fallback support for path alongisde pathname.

Fix bug in parsing raw strings supplied to request to URLs by correcting object keys.
