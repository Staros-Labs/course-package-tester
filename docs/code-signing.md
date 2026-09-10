# Windows Code Signing

Course Package Tester supports Authenticode signing for Windows release builds.

Unsigned builds are allowed only as an explicit release exception. Release notes and handoff docs must say when a build is unsigned.

## GitHub Actions

The `Signed Windows Release` workflow is disabled. Current CI runs Linux tests only.
Do not add certificate material to GitHub Actions for the current release lane.

## Local Signing Inputs

Local signing uses a PFX certificate and password supplied to the Windows build script:

Do not commit certificate files, certificate passwords, signing tokens, or generated secret files.

## Local Signed Build

On Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows.ps1 -Signed -CertificateFile "C:\path\to\certificate.pfx" -CertificatePassword "certificate-password"
```

To verify an already built app:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-windows-signature.ps1 -RequireValid
```

## Release Notes

Signed release notes must include:

- artifact name
- SHA256 checksum
- signature status
- signer subject

Unsigned release notes must include:

- artifact name
- SHA256 checksum
- clear unsigned status
- expected SmartScreen or trust-warning caveat
