---
'@evervault/sdk': major
---

We have released a new API for Function run requests which is more robust, more extensible, and which provides more useful error messages when Function runs fail. This change migrates all Function run requests to the new API. In addition, we have removed the `encryptAndRun` method, async Function run requests, and specifying version of Function to run. For more details check out https://docs.evervault.com/sdks/nodejs#run()
