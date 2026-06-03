# Release Checklist

1. Confirm `package.json` version matches the intended tag.
2. Run `npm ci`.
3. Run `npm test`.
4. Build the Windows package.
5. Confirm the release zip name includes the version.
6. Confirm SHA256 checksum file exists.
7. For unsigned releases, confirm release notes and handoff docs say unsigned and mention possible SmartScreen or publisher warnings.
8. For signed releases, verify Authenticode status is `Valid`.
9. Confirm signature status is documented in release notes.
10. Launch the app on Windows.
11. Launch the sample package in SCORM Mock mode.
12. Import a zip package.
13. Export a Tester Report.
14. Export diagnostics.
15. Create the GitHub Release with zip and checksum attached.
