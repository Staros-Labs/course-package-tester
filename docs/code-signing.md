# Windows Code Signing

Course Package Tester supports Authenticode signing for Windows release builds.

Unsigned builds are allowed only as an explicit release exception. Release notes and handoff docs must say when a build is unsigned.

## Required Secrets

For GitHub Actions signing with a PFX certificate, configure these repository secrets:

| Secret | Required | Description |
|---|---:|---|
| `WINDOWS_CERTIFICATE_BASE64` | Yes | Base64-encoded `.pfx` certificate file. |
| `WINDOWS_CERTIFICATE_PASSWORD` | Yes | Password for the `.pfx` certificate. |
| `WINDOWS_SIGN_WITH_PARAMS` | No | Custom `signtool.exe` parameters for HSM or provider-specific signing. |
| `WINDOWS_TIMESTAMP_SERVER` | No | Timestamp server URL. Defaults to the signing tool default. |

Do not commit certificate files, certificate passwords, signing tokens, or generated secret files.

## Create The Base64 Secret

On macOS or Linux:

```bash
base64 -i path/to/certificate.pfx | pbcopy
```

On Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\certificate.pfx")) | Set-Clipboard
```

Paste the output into the `WINDOWS_CERTIFICATE_BASE64` repository secret.

## Manual Signed Build

After secrets are configured, run the `Signed Windows Release` workflow from GitHub Actions. The workflow:

1. installs dependencies
2. runs tests
3. builds the Windows app
4. writes the certificate to the runner temp directory
5. signs the app
6. verifies Authenticode status is `Valid`
7. creates the release zip and checksum
8. uploads the signed zip as a workflow artifact

The workflow does not publish a GitHub Release by itself. Attach the verified artifact to a release only after reviewing the checksum and signature output.

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
