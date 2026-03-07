$ErrorActionPreference = "Stop"

$RepoPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoPath

$git = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $git)) {
  Write-Output "[AUTO-SYNC] Git not found at $git"
  exit 1
}

if (-not (Test-Path ".git")) {
  & $git init | Out-Null
  & $git branch -M main | Out-Null
}

try {
  $null = & $git config user.name
  if (-not $?) { throw "no-name" }
} catch {
  & $git config user.name "IPARK"
}

try {
  $null = & $git config user.email
  if (-not $?) { throw "no-email" }
} catch {
  & $git config user.email "ipark@local"
}

$lastNoRemoteLog = $null
$lastPushErrorLog = $null

function Get-TimeStamp {
  return (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

function Log-OncePerMinute {
  param(
    [string]$Key,
    [string]$Message
  )
  $now = Get-Date
  if ($Key -eq "noremote") {
    if (-not $script:lastNoRemoteLog -or ($now - $script:lastNoRemoteLog).TotalSeconds -ge 60) {
      Write-Output $Message
      $script:lastNoRemoteLog = $now
    }
  } elseif ($Key -eq "pusherror") {
    if (-not $script:lastPushErrorLog -or ($now - $script:lastPushErrorLog).TotalSeconds -ge 60) {
      Write-Output $Message
      $script:lastPushErrorLog = $now
    }
  }
}

Write-Output "[AUTO-SYNC] started at $(Get-TimeStamp)"

while ($true) {
  try {
    $origin = (& $git remote get-url origin 2>$null)
    if (-not $origin) {
      Log-OncePerMinute -Key "noremote" -Message "[AUTO-SYNC] origin remote is not configured. Waiting..."
      Start-Sleep -Seconds 10
      continue
    }

    $status = & $git status --porcelain
    if ($status) {
      & $git add -A | Out-Null
      $msg = "auto-sync: $(Get-TimeStamp)"
      & $git commit -m $msg | Out-Null
      & $git push origin main | Out-Null
      Write-Output "[AUTO-SYNC] pushed at $(Get-TimeStamp)"
    }
  } catch {
    Log-OncePerMinute -Key "pusherror" -Message "[AUTO-SYNC] push failed at $(Get-TimeStamp): $($_.Exception.Message)"
  }

  Start-Sleep -Seconds 10
}
