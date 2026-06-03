# Network Behavior

Course Package Tester is designed to stay local.

Its own intentional network activity is limited to loopback requests between the browser UI, CLI helpers, desktop wrapper, and local tester server:

```text
http://localhost:<port>/...
http://127.0.0.1:<port>/...
```

The tester does not include analytics, auto-update checks, cloud APIs, telemetry collectors, third-party CDNs, or package uploads.

## Course Package Boundary

The tester loads course package content selected by the user. A package under test may contain its own external scripts, images, fonts, APIs, or tracking calls. That behavior belongs to the package, not to the tester shell.

For strict offline review, inspect both the tester and the course package.
