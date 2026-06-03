# Agency Feedback Checklist

Use this checklist for the first external review round.

## Install And Launch

- Did Windows show a publisher warning or SmartScreen warning?
- Was the zip easy to extract?
- Did `CoursePackageTester.exe` launch from the extracted folder?
- Did the app ask for the expected course folder?
- Did the app reopen cleanly after closing it?

## Package Loading

- Did unpacked folders appear in the course list?
- Did zip import work?
- If zip import failed, what message appeared?
- Did the course launch in Standalone mode?
- Did the course launch in SCORM Mock mode?

## Review Workflow

- Was the launch mode naming clear?
- Was the SCORM API log useful?
- Did resume testing behave as expected?
- Did mobile simulation help identify layout or launch issues?
- Did local event capture show expected activity?

## Exports

- Could they export a Tester Report?
- Could they export diagnostics?
- Were the exported files safe and useful enough to share?
- What field or wording was missing from the Tester Report?

## Follow-Up Data To Request

- App version.
- Windows version.
- Package type: SCORM zip, generic zip, or unpacked folder.
- Launch mode.
- Sanitized error text or screenshot.
- Tester Report or diagnostics when safe to share.
