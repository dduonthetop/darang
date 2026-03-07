$ErrorActionPreference = "Stop"

$RepoPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoPath

$git = "C:\Program Files\Git\cmd\git.exe"
$gh = "C:\Program Files\GitHub CLI\gh.exe"

if (-not (Test-Path $git)) {
  throw "Git not found: $git"
}
if (-not (Test-Path $gh)) {
  throw "GitHub CLI not found: $gh"
}

try {
  & $gh auth status | Out-Null
} catch {
  throw "GitHub CLI is not authenticated. Run: `"$gh auth login --web --git-protocol https`""
}

$owner = (& $gh api user --jq .login).Trim()
if (-not $owner) {
  throw "Unable to read authenticated GitHub user."
}

$repoName = "darang"
$repoFull = "$owner/$repoName"
$repoUrl = "https://github.com/$repoFull.git"

try {
  & $gh repo view $repoFull | Out-Null
} catch {
  & $gh repo create $repoFull --public --disable-issues --disable-wiki | Out-Null
}

$hasOrigin = (& $git remote) -contains "origin"
if ($hasOrigin) {
  & $git remote set-url origin $repoUrl
} else {
  & $git remote add origin $repoUrl
}

& $git push -u origin main
Write-Output "Remote connected and pushed: $repoUrl"
