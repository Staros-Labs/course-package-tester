param(
  [string]$AppDir = "",
  [switch]$RequireValid
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path (Join-Path $ScriptDir "..")

if (-not $AppDir) {
  $AppDir = Join-Path $ProjectDir "dist\desktop\Course Package Tester-win32-x64"
}

$ExePath = Join-Path $AppDir "CoursePackageTester.exe"

if (-not (Test-Path $ExePath)) {
  throw "Executable not found: $ExePath"
}

$signature = Get-AuthenticodeSignature $ExePath

Write-Host "Executable: $ExePath"
Write-Host "Signature status: $($signature.Status)"

if ($signature.SignerCertificate) {
  Write-Host "Signer: $($signature.SignerCertificate.Subject)"
  Write-Host "Thumbprint: $($signature.SignerCertificate.Thumbprint)"
}

if ($RequireValid -and $signature.Status -ne "Valid") {
  throw "Signature status is $($signature.Status), expected Valid."
}
