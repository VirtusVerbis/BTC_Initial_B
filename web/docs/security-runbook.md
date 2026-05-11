# Security Runbook

## Incident categories

1. Upstream outage (Binance/Coinbase/Mempool not available)
2. Malformed payload spike (parser rejection increases)
3. Dependency vulnerability alert
4. Hosting misconfiguration or header regression

## Immediate response checklist

- Confirm service status and affected browsers/devices.
- Capture logs and reproduction details.
- Validate CSP and security headers from deployed edge.
- Roll back to latest healthy deployment if regression was introduced.

## Dependency vulnerability handling

- Review advisory severity and exploitability.
- Patch with minimal compatible versions.
- Run `npm run test`, `npm run lint`, and `npm run build`.
- Redeploy and monitor.

## Communication template

- Affected scope: browsers/devices/feeds
- User impact: degraded visuals, stale data, or unavailable feed
- Mitigation in place: rollback, upstream status, patch
- ETA for recovery
