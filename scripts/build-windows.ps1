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

npm install
npm test
npm run package:windows

if ($Signed) {
  npm run sign:windows
}

if (Test-Path $ZipPath) {
  Remove-Item $ZipPath -Force
}

Compress-Archive -Path $AppDir -DestinationPath $ZipPath -Force

$hash = Get-FileHash $ZipPath -Algorithm SHA256
"$($hash.Hash.ToLowerInvariant())  $(Split-Path -Leaf $ZipPath)" | Set-Content -Path $HashPath -Encoding ascii

Write-Host "Created: $ZipPath"
Write-Host "SHA256: $($hash.Hash.ToLowerInvariant())"

if (Test-Path $ExePath) {
  $signature = Get-AuthenticodeSignature $ExePath
  Write-Host "Signature status: $($signature.Status)"
  if ($signature.SignerCertificate) {
    Write-Host "Signer: $($signature.SignerCertificate.Subject)"
  }
}

if ($Signed -and (Test-Path $ExePath)) {
  $signature = Get-AuthenticodeSignature $ExePath
  if ($signature.Status -ne "Valid") {
    throw "Signed build requested, but Authenticode signature status is $($signature.Status)."
  }
}
