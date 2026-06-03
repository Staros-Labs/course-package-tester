# Release Checklist

1. Confirm `package.json` version matches the intended tag.
2. Run `npm ci`.
3. Run `npm test`.
4. Build the Windows package.
5. Confirm the release zip name includes the version.
6. Confirm SHA256 checksum file exists.
7. For signed releases, verify Authenticode status is `Valid`.
8. Confirm signature status is documented in release notes.
9. Launch the app on Windows.
10. Launch the sample package in SCORM Mock mode.
11. Import a zip package.
12. Export a Tester Report.
13. Export diagnostics.
14. Create the GitHub Release with zip and checksum attached.
