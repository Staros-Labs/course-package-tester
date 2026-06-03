# Public Release Plan

Course Package Tester v1.0.0 establishes the public Staros Labs repository, MIT licensing, a Windows x64 portable release, local zip import, SCORM manifest launch detection, local-only diagnostics, Tester Reports, basic CI, Dependabot, issue templates, and a security policy.

The public repository is the canonical product surface. Legacy embedded copies in private source repositories should become pointer-only after this baseline is proven.

## Current Public Release

v1.0.2 is the current unsigned patch release. It syncs packaged documentation with the public repository, adds first-run agency feedback prompts, and preserves the v1.0.1 dependency, manifest parser, handoff, and signed-release operations updates.

Windows code signing remains deferred until a certificate or signing provider is available. Release notes and handoff materials must continue to call out unsigned status while that remains true.
