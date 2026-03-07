$ErrorActionPreference = "Stop"

param(
  [string]$RepoUrl = "https://github.com/dduonthetop/darang.git",
  [string]$TargetPath = "$HOME\\darang"
)

Write-Output "[BOOTSTRAP] Installing Git and GitHub CLI..."
winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements | Out-Null
winget install --id GitHub.cli -e --source winget --accept-package-agreements --accept-source-agreements | Out-Null

$git = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $git)) {
  throw "Git install failed. Expected path: $git"
}

if (-not (Test-Path $TargetPath)) {
  & $git clone $RepoUrl $TargetPath
}

Set-Location $TargetPath

Write-Output "[BOOTSTRAP] GitHub login is required once."
& "C:\Program Files\GitHub CLI\gh.exe" auth login --web --git-protocol https

Write-Output "[BOOTSTRAP] Setting up remote and startup auto-sync..."
powershell -ExecutionPolicy Bypass -File (Join-Path $TargetPath "setup_github_remote.ps1")

$startup = [Environment]::GetFolderPath('Startup')
Copy-Item -Path (Join-Path $TargetPath "start_auto_sync.bat") -Destination (Join-Path $startup "DarangAutoSync.bat") -Force
Start-Process -FilePath "powershell" -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File $TargetPath\\auto_sync.ps1"

Write-Output "[BOOTSTRAP] Done."
