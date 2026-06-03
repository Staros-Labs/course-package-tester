param(
  [switch]$Signed,
  [string]$CertificateFile = "",
  [string]$CertificatePassword = "",
  [string]$SignWithParams = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path (Join-Path $ScriptDir "..")
$DesktopDir = Join-Path $ProjectDir "dist\desktop"
$AppDir = Join-Path $DesktopDir "Course Package Tester-win32-x64"
$PackageJson = Get-Content (Join-Path $ProjectDir "package.json") | ConvertFrom-Json
$ZipPath = Join-Path $DesktopDir "CoursePackageTester_Windows_x64_v$($PackageJson.version).zip"
$HashPath = "$ZipPath.sha256.txt"
$ExePath = Join-Path $AppDir "CoursePackageTester.exe"

Set-Location $ProjectDir

if ($CertificateFile) {
  $env:WINDOWS_CERTIFICATE_FILE = $CertificateFile
}

if ($CertificatePassword) {
  $env:WINDOWS_CERTIFICATE_PASSWORD = $CertificatePassword
}

if ($SignWithParams) {
  $env:WINDOWS_SIGN_WITH_PARAMS = $SignWithParams
}

npm ci
npm test
npm run package:windows

if ($Signed) {
  npm run sign:windows
  powershell -ExecutionPolicy Bypass -File (Join-Path $ScriptDir "verify-windows-signature.ps1") -RequireValid
}

npm run package:windows:zip:existing

Write-Host "Created: $ZipPath"
if (Test-Path $HashPath) {
  Write-Host (Get-Content $HashPath)
}

if (Test-Path $ExePath) {
  $signature = Get-AuthenticodeSignature $ExePath
  Write-Host "Signature status: $($signature.Status)"
  if ($signature.SignerCertificate) {
    Write-Host "Signer: $($signature.SignerCertificate.Subject)"
  }
}
