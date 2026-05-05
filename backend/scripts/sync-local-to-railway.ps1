# Sync PostgreSQL: plain SQL (pg_dump -> .sql -> psql on Railway).
# Same idea as: pg_dump ... > backup.sql && psql RAILWAY_URL < backup.sql
#
# Usage:
#   $env:LOCAL_DATABASE_URL   = "postgresql://postgres:123456@127.0.0.1:5432/fly_edu"
#   $env:RAILWAY_DATABASE_URL = "postgresql://..."   # hoặc REMOTE_DATABASE_URL
#   .\scripts\sync-local-to-railway.ps1
#
# WARNING: dump with --clean adds DROP statements; restores overwrite objects on Railway.
# Optional: -KeepSql to keep the generated .sql file.
#
# pg_dump 17.6+ / 18 adds psql meta-lines \restrict / \unrestrict. Older psql treats \ as
# commands (invalid command \69). This script strips those two lines before restore.

[CmdletBinding()]
param(
  [string]$SqlPath = "",
  [switch]$KeepSql
)

$ErrorActionPreference = "Stop"

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($SqlPath)) {
  $SqlPath = Join-Path $scriptDir "..\fly_local_backup.sql"
}

function Find-PostgresBin {
  $candidates = @(
    "C:\Program Files\PostgreSQL\18\bin",
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin"
  )
  foreach ($d in $candidates) {
    if (Test-Path (Join-Path $d "pg_dump.exe")) { return $d }
  }
  return $null
}

$pgBin = Find-PostgresBin
if ($pgBin) {
  $env:Path = "$pgBin;$env:Path"
}

function Ensure-Tool($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing '$name'. Install PostgreSQL client (bin on PATH)."
  }
}
Ensure-Tool "pg_dump"
Ensure-Tool "psql"

function Remove-PsqlRestrictDirectives([string]$path) {
  $enc = New-Object System.Text.UTF8Encoding $false
  $lines = [System.IO.File]::ReadAllLines($path, $enc)
  $rxRestrict = '^\\restrict\s'
  $rxUnrestrict = '^\\unrestrict\s'
  $out = foreach ($line in $lines) {
    if ($line -match $rxRestrict -or $line -match $rxUnrestrict) { continue }
    $line
  }
  [System.IO.File]::WriteAllLines($path, [string[]]$out, $enc)
}

$localUrl = $env:LOCAL_DATABASE_URL
$railUrl  = $env:RAILWAY_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($railUrl)) { $railUrl = $env:REMOTE_DATABASE_URL }

if ([string]::IsNullOrWhiteSpace($localUrl)) {
  throw "Set env LOCAL_DATABASE_URL (e.g. postgresql://postgres:...@127.0.0.1:5432/fly_edu)."
}
if ([string]::IsNullOrWhiteSpace($railUrl)) {
  throw "Set env RAILWAY_DATABASE_URL or REMOTE_DATABASE_URL (cloud Postgres connection string)."
}

if ($railUrl -notmatch 'sslmode=') {
  $sep = if ($railUrl.Contains('?')) { '&' } else { '?' }
  $railUrl = "$railUrl${sep}sslmode=require"
}

$sqlFull = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($SqlPath)

Write-Host ""
Write-Host "[1/2] pg_dump (plain SQL, --clean) -> $sqlFull" -ForegroundColor Cyan
& pg_dump `
  --dbname="$localUrl" `
  --format=p `
  --clean `
  --if-exists `
  --no-owner `
  --no-acl `
  --verbose `
  --file="$sqlFull"
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed (exit $LASTEXITCODE)." }

Write-Host "Stripped \\restrict / \\unrestrict for older psql (trusted local dump only)." -ForegroundColor DarkGray
Remove-PsqlRestrictDirectives $sqlFull

Write-Host ""
Write-Host "[2/2] psql restore -> Railway (-X no-psqlrc)" -ForegroundColor Cyan
& psql -X --dbname="$railUrl" -v ON_ERROR_STOP=1 -f "$sqlFull"
if ($LASTEXITCODE -ne 0) {
  Write-Warning "psql exited $LASTEXITCODE - check Railway DB."
}

if (-not $KeepSql -and (Test-Path $sqlFull)) {
  Remove-Item -LiteralPath $sqlFull -Force
  Write-Host "Removed temp SQL file." -ForegroundColor DarkGray
} elseif ($KeepSql) {
  Write-Host "Kept SQL file: $sqlFull" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Done. Verify on Railway; restart Railway backend if needed." -ForegroundColor Green
