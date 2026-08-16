$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is required. Install the current LTS release first.'
}
if (-not (Test-Path 'node_modules')) { npm install }
Start-Process 'http://localhost:5173'
npm run dev
