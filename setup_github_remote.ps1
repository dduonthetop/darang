$ErrorActionPreference = "Stop"

$RepoPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoPath

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
  $git = $gitCmd.Source
} elseif (Test-Path "C:\Program Files\Git\cmd\git.exe") {
  $git = "C:\Program Files\Git\cmd\git.exe"
} else {
  $git = $null
}

$ghCmd = Get-Command gh -ErrorAction SilentlyContinue
if ($ghCmd) {
  $gh = $ghCmd.Source
} elseif (Test-Path "C:\Program Files\GitHub CLI\gh.exe") {
  $gh = "C:\Program Files\GitHub CLI\gh.exe"
} else {
  $gh = $null
}

if (-not $git -or -not (Test-Path $git)) {
  throw "Git not found: $git"
}
if (-not $gh -or -not (Test-Path $gh)) {
  throw "GitHub CLI not found: $gh"
}

try {
  & $gh auth status *> $null
} catch {
  throw "GitHub CLI is not authenticated. Run: `"$gh auth login --web --git-protocol https`""
}
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI is not authenticated. Run: `"$gh auth login --web --git-protocol https`""
}

try {
  $ownerRaw = & $gh api user --jq .login 2>$null
} catch {
  throw "Unable to read authenticated GitHub user. Complete gh auth login first."
}
if ($LASTEXITCODE -ne 0 -or -not $ownerRaw) {
  throw "Unable to read authenticated GitHub user. Complete gh auth login first."
}

$owner = $ownerRaw.Trim()
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
