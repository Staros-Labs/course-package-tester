# Release Checklist

1. Confirm `package.json` version matches the intended tag.
2. Run `npm install`.
3. Run `npm test`.
4. Build the Windows package.
5. Confirm the release zip name includes the version.
6. Confirm SHA256 checksum file exists.
7. Confirm signature status is documented.
8. Launch the app on Windows.
9. Launch the sample package in SCORM Mock mode.
10. Import a zip package.
11. Export a Tester Report.
12. Export diagnostics.
13. Create the GitHub Release with zip and checksum attached.
