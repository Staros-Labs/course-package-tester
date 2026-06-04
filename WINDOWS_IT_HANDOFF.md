# Windows IT Handoff

Course Package Tester is a local desktop wrapper for reviewing course packages before upload to a learning platform.

The Windows package is portable. It does not install a service, does not require administrator rights by design, and does not intentionally contact external systems.

## Expected Runtime Behavior

When launched, the app:

1. asks the user to select a local folder containing unpacked course folders
2. starts a local server bound to `127.0.0.1`
3. opens the tester UI in an embedded browser window
4. serves selected course files from the chosen local folder or managed import library

Expected tester traffic is limited to loopback URLs.

## Signature Status

The current v1.1.0 release is unsigned. Unsigned builds will show as unsigned in Windows and may trigger SmartScreen or publisher trust warnings.

Current release:

```text
https://github.com/Staros-Labs/course-package-tester/releases/tag/v1.1.0
```

Current Windows artifact:

```text
CoursePackageTester_Windows_x64_v1.1.0.zip
```

Current SHA256:

```text
9aa94de18d1ab3c3cf139f633fbbeda0a1c789b0af506fe5c143265705399791
```

Signed builds should be verified with:

```powershell
Get-AuthenticodeSignature ".\Course Package Tester-win32-x64\CoursePackageTester.exe"
```

The signature status should be `Valid` for signed releases. The release zip should be checked against the published SHA256 checksum.
