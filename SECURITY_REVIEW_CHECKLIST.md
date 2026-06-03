# Security Review Checklist

Use this checklist for IT or security review.

- Confirm the app serves only local loopback URLs.
- Confirm there are no analytics, update, or cloud endpoints.
- Confirm imported zip packages are treated as untrusted input.
- Confirm zip extraction blocks unsafe paths.
- Confirm course content is not loaded through `file://`.
- Confirm Electron uses `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`.
- Confirm course content has no access to Node APIs or shell privileges.
- Confirm package content is reviewed separately when outbound controls matter.
- Confirm the release checksum matches the published SHA256.
- Confirm Authenticode signature status when a signed release is provided.

Useful searches:

```bash
rg -n "fetch\\(|http://|https://|WebSocket|XMLHttpRequest|authorization|bearer|analytics|telemetry|segment|sentry" .
```

```bash
rg -n "autoUpdater|setFeedURL|shell\\.openExternal|nodeIntegration|contextIsolation|sandbox" electron server.mjs public lib
```
