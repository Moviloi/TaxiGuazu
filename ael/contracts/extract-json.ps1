# ARNÉS Contract Enforcement — PowerShell JSON extractor v1.1
# Usage: powershell -File ael/contracts/extract-json.ps1 -Query ".product"
#        powershell -File ael/contracts/extract-json.ps1 -Query ".rules.r1.forbidden_imports | length"
#        powershell -File ael/contracts/extract-json.ps1 -Query ".rules.r1.forbidden_imports[0].description"
param([string]$Query)

# Validate dependencies
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Error "PowerShell 5.0+ required. Current: $($PSVersionTable.PSVersion)"
    exit 1
}

# Resolve path relative to script location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path "$scriptDir/../.."
$rulesFile = Join-Path $projectRoot "ael/contracts/product-rules.json"

if (-not (Test-Path $rulesFile)) {
    Write-Error "product-rules.json not found at: $rulesFile"
    exit 1
}

$data = Get-Content $rulesFile -Raw | ConvertFrom-Json

if ($Query -match "\| length$") {
    # Array count query
    $path = $Query -replace " \| length$", "" -replace "^\.", ""
    $parts = $path -split '\.'
    $current = $data
    foreach ($part in $parts) {
        if ($part -match '^(.+)\[(\d+)\]$') {
            $current = $current.($Matches[1])[$Matches[2]]
        } else {
            $current = $current.$part
        }
        if ($null -eq $current) { break }
    }
    if ($current -is [array]) { $current.Count } else { "0" }
} else {
    # Simple value query
    $path = $Query -replace "^\.", ""
    $parts = $path -split '\.'
    $current = $data
    foreach ($part in $parts) {
        if ($part -match '^(.+)\[(\d+)\]$') {
            $current = $current.($Matches[1])[$Matches[2]]
        } else {
            $current = $current.$part
        }
        if ($null -eq $current) { break }
    }
    if ($null -eq $current) { "" } else { "$current" }
}
