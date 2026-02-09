$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is required. Install it from https://nodejs.org/ and re-run this script."
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "npm is required. Install Node.js from https://nodejs.org/ and re-run this script."
  exit 1
}

Write-Host "Installing root dependencies..."
Set-Location $rootDir
npm install

Write-Host "Installing js_app dependencies..."
Set-Location (Join-Path $rootDir "js_app")
npm install

Write-Host "Install complete."
