# Security Note and Limitations

## Controls implemented in the web app

- Payload validation and parsing guards for exchange socket messages.
- Bounded websocket payload handling and reconnect backoff.
- CSP, frame-ancestor protection, HSTS, and related headers at hosting edge.
- Dependency scanning and CI checks for lint/test/build.

## Limitations that cannot be fully prevented client-side

- Upstream exchange/mempool data may be delayed, degraded, or incorrect.
- Compromised client devices, browser extensions, or hostile local networks can tamper with runtime behavior.
- Any configuration shipped to browser bundles is public (no client secrets).
- Without a backend control plane, abuse/rate-limiting controls are limited.

## User notice

This app is informational and entertainment-focused. It is not trading advice. Data can be delayed or unavailable.
