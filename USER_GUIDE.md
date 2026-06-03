# Course Package Tester User Guide

Course Package Tester lets you review unpacked course folders and imported zip packages on your own computer before uploading them to a learning platform.

## Windows Desktop App

Download the latest Windows release from:

```text
https://github.com/Staros-Labs/course-package-tester/releases/latest
```

The current v1.1.0 Windows release is unsigned. Windows may show a publisher or SmartScreen warning.

1. Extract the full Windows zip.
2. Open the extracted folder.
3. Double-click `CoursePackageTester.exe`.
4. Choose the folder that contains unpacked course folders.
5. Select a course or import a zip package.
6. Choose a launch mode.
7. Click `Launch Course`.

Do not move `CoursePackageTester.exe` out of the extracted folder. It needs the supporting files next to it.

## Zip Import

Use `Import Zip` to add a package to the tester's managed local import library.

Imported packages stay on your computer. The tester does not upload packages.

If import fails, the app shows the import category and a suggested next step. Common causes are an invalid zip, a package without an `imsmanifest.xml` launch target or `index.html`, unsafe zip paths, or a package that exceeds local safety limits.

## Recent Packages

Recently launched or imported packages appear under `Recent Packages`. This list is stored in the local browser profile and is not uploaded.

## Launch Modes

- `Standalone`: no parent LMS API.
- `SCORM Mock`: exposes a local SCORM 1.2 API mock.
- `Resume Session`: exposes a SCORM 1.2 API mock with preset resume values.
- `Mobile Simulation`: simulates a phone/tablet launch context.
- `Local Events`: enables the tester's local event capture endpoint.

## Reports

`Tester Report` exports a local JSON report with package, launch, session, manifest, and local event details.

`Diagnostics` exports local troubleshooting information. Review diagnostics before sharing because they may include local package names or paths.

`Feedback Summary` exports a local JSON bundle with feedback prompts, a Tester Report, and diagnostics. Review it before sharing because it may include local package names or paths.
