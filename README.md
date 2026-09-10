# Course Package Tester

Course Package Tester is a local preflight utility for reviewing course packages before upload to a learning platform.

It can launch unpacked folders or imported zip packages in a local browser harness, expose a SCORM 1.2 mock API, simulate resume state, inspect runtime calls, and export local tester reports.

It is not a course authoring tool, LMS, SCORM certification tool, hosted LRS, or substitute for final validation in the target LMS.

## Features

- Launch unpacked course folders from a selected local library.
- Import zip packages into a persistent local library.
- Prefer SCORM manifest launch targets when `imsmanifest.xml` is available.
- Fall back to generic `index.html` package launches.
- Test standalone, SCORM mock, resume, mobile simulation, and local event capture modes.
- Export local Tester Reports, diagnostics, and feedback summaries.
- Keep recent package shortcuts in the local browser profile.
- Run as a local Node server or packaged Windows desktop app.

## Requirements

- Node.js 20 or newer for local development.
- Windows for the packaged desktop release.
- A modern browser.

## Install

```bash
npm install
```

## Run Locally

```bash
npm start
```

Then open:

```text
http://localhost:4310/scorm-tester/
```

To point the tester at a course folder:

```bash
COURSE_TESTER_ROOT="/path/to/course-library" npm start
```

## Desktop App

```bash
npm run desktop
```

On first launch, choose the folder that contains unpacked course folders. Imported zip packages are stored in the app's local user-data directory and remain available across launches.

## Windows Package

Latest release:

```text
https://github.com/Staros-Labs/course-package-tester/releases/latest
```

Current release:

```text
https://github.com/Staros-Labs/course-package-tester/releases/tag/v1.1.0
```

```bash
npm run package:windows:zip
```

The current unsigned Windows package is written to:

```text
dist/desktop/CoursePackageTester_Windows_x64_v1.1.0.zip
```

A SHA256 checksum is written next to the zip.

Current v1.1.0 SHA256:

```text
9aa94de18d1ab3c3cf139f633fbbeda0a1c789b0af506fe5c143265705399791
```

## Signing

Windows code signing is supported but requires a Staros Labs Authenticode certificate. The current v1.1.0 release is unsigned, and release notes state that status.

See [Windows Code Signing](./docs/code-signing.md) for local signing commands and release-note requirements.

On Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows.ps1 -Signed -CertificateFile "C:\path\to\certificate.pfx" -CertificatePassword "certificate-password"
```

## Tests

```bash
npm test
```

## Trust Boundary

The tester itself is local-only by design. It does not upload packages, reports, diagnostics, or usage data.

Course packages are untrusted input. A package launched inside the tester may still contain its own external images, scripts, fonts, APIs, or tracking calls. Review package content separately when strict offline behavior is required.

## License

MIT. See [LICENSE](./LICENSE).
