# Remove pg_dump 17.6+ / 18 psql meta-lines so older psql can restore plain SQL.
# Usage: .\strip-pgdump-restrict.ps1 ..\backup.sql

param(
  [Parameter(Mandatory = $true)]
  [string]$SqlPath
)

$ErrorActionPreference = "Stop"
$full = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($SqlPath)
if (-not (Test-Path -LiteralPath $full)) { throw "File not found: $full" }

$enc = New-Object System.Text.UTF8Encoding $false
$lines = [System.IO.File]::ReadAllLines($full, $enc)
$rxRestrict = '^\\restrict\s'
$rxUnrestrict = '^\\unrestrict\s'
$out = [System.Collections.Generic.List[string]]::new($lines.Length)
foreach ($line in $lines) {
  if ($line -match $rxRestrict -or $line -match $rxUnrestrict) { continue }
  [void]$out.Add($line)
}
[System.IO.File]::WriteAllLines($full, $out.ToArray(), $enc)
Write-Host "Stripped \\restrict / \\unrestrict from: $full" -ForegroundColor Green
