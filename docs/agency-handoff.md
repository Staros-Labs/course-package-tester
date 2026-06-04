# Agency Handoff

Use this when sharing Course Package Tester with an external team.

## Release Link

Download the latest Windows release from:

```text
https://github.com/Staros-Labs/course-package-tester/releases/latest
```

Current reviewed release:

```text
https://github.com/Staros-Labs/course-package-tester/releases/tag/v1.1.0
```

## Suggested Email

```text
Hi,

We published Course Package Tester as a public Staros Labs utility for local course-package preflight testing.

Download:
https://github.com/Staros-Labs/course-package-tester/releases/tag/v1.1.0

Use the Windows x64 zip asset:
CoursePackageTester_Windows_x64_v1.1.0.zip

After downloading, compare the zip against this published SHA256 checksum:
9aa94de18d1ab3c3cf139f633fbbeda0a1c789b0af506fe5c143265705399791

Current signature status:
The v1.1.0 release is unsigned. Windows may show a publisher or SmartScreen warning. Signed releases are deferred until a code-signing certificate is available.

Runtime behavior:
The app is local-only by design. It starts a local server on 127.0.0.1, opens a desktop browser window, and serves course files selected from the local machine. It does not upload course packages, reports, diagnostics, or usage data.

Basic use:
1. Extract the zip.
2. Run CoursePackageTester.exe.
3. Select a folder that contains unpacked course folders, or use Import Zip inside the app.
4. Launch the course in Standalone or SCORM Mock mode.
5. Export a Tester Report, diagnostics, or Feedback Summary if you need to share findings.

Reference:
https://github.com/Staros-Labs/course-package-tester/blob/main/WINDOWS_IT_HANDOFF.md

Feedback:
Please report whether Windows warned on first launch, whether extraction and launch were clear, whether folder selection or zip import failed, and whether the Tester Report or Feedback Summary had enough detail for troubleshooting.
```

## Before Sending

- Confirm the release URL points to the intended version.
- Confirm the release checksum matches the attached or referenced zip.
- Confirm the signature status in the email matches the release notes.
- Include the feedback prompts from [Agency Feedback Checklist](./agency-feedback-checklist.md) when asking for first-run results.
- Do not include private course names, customer names, local paths, or roadmap plans.
