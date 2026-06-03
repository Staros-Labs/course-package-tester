# Public Release Plan

Course Package Tester v1.0.0 establishes the public Staros Labs repository, MIT licensing, a Windows x64 portable release, local zip import, SCORM manifest launch detection, local-only diagnostics, Tester Reports, basic CI, Dependabot, issue templates, and a security policy.

The public repository is the canonical product surface. Legacy embedded copies in private source repositories should become pointer-only after this baseline is proven.

## Current Public Release

v1.0.1 is the current unsigned patch release. It adds dependency updates, manifest parser compatibility for `@xmldom/xmldom` 0.9, agency handoff documentation, and signed-release operations for future Authenticode releases.

Windows code signing remains deferred until a certificate or signing provider is available. Release notes and handoff materials must continue to call out unsigned status while that remains true.
