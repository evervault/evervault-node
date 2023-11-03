---
'@evervault/sdk': major
---

Simplifying errors thrown by the SDK.

Previously we exposed many different error types for users to handle, but in most cases these errors were not something that could be caught and handled, but were rather indicative of a larger configuration issue. This change simplifies the errors thrown by returning an EvervaultError with accompanying error message by default, unless they are a transient error which can be handled programmatically, in which case a specific error is returned.
