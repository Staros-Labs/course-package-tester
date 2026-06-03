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
- Export local Tester Reports and diagnostics.
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

```bash
npm run package:windows:zip
```

The unsigned Windows package is written to:

```text
dist/desktop/CoursePackageTester_Windows_x64_v1.0.0.zip
```

A SHA256 checksum is written next to the zip.

## Signing

Windows code signing is supported but requires a Staros Labs Authenticode certificate. Unsigned release builds must state that status in the release notes.

See [Windows Code Signing](./docs/code-signing.md) for GitHub Actions secrets, local signing commands, and release-note requirements.

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
