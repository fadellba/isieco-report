<#
.SYNOPSIS
    Contrôle de cohérence du AI Frontend SDK.
.DESCRIPTION
    Vérifie :
      1. La cohérence de version (1.1.0) dans les fichiers de référence.
      2. L'existence de toutes les références internes aux documents .md.
      3. La définition des identifiants BR-*, SCR-*, CMP-*, UF-*, RG*.
      4. Signale les sections « à compléter » (placeholders) des docs.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools/check-consistency.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$pass = 0; $fail = 0; $warn = 0
$files = @()

function Out-Fail([string]$message) { $script:fail++; Write-Host "FAIL  $message" -ForegroundColor Red }
function Out-Pass([string]$message) { $script:pass++; Write-Host "PASS  $message" -ForegroundColor Green }
function Out-Warn([string]$message) { $script:warn++; Write-Host "WARN  $message" -ForegroundColor Yellow }

Write-Host "`n=== AI Frontend SDK - Controle de coherence ===" -ForegroundColor Cyan
Write-Host "Racine : $root`n"

# ---------------------------------------------------------------------------
# 1. Cohérence de version
# ---------------------------------------------------------------------------
Write-Host "--- 1. Coherence de version (1.1.0) ---" -ForegroundColor Cyan
$versionFiles = @(
    'MASTER.md', 'README.md', 'MANIFEST.md', 'AI_CONTEXT.md',
    'RELEASE\VERSION.md', 'RELEASE\CHANGELOG.md', 'RELEASE\COMPATIBILITY.md', 'RELEASE\ROADMAP.md'
)
foreach ($f in $versionFiles) {
    $path = Join-Path $root $f
    if (-not (Test-Path -LiteralPath $path)) { Out-Fail "$f manquant"; continue }
    $content = Get-Content -LiteralPath $path -Raw
    if ($content -match '1\.1\.0') { Out-Pass "$f contient 1.1.0" } else { Out-Fail "$f ne contient pas 1.1.0" }
}

# ---------------------------------------------------------------------------
# Collecte des fichiers audités (hors OUTPUT : rapports historiques)
# ---------------------------------------------------------------------------
$scanRoots = @('docs', 'PROJECT_RULES', 'WORKFLOW', 'TEMPLATES', 'PROMPTS', 'AGENTS', 'RELEASE')
foreach ($r in $scanRoots) {
    $dir = Join-Path $root $r
    if (Test-Path -LiteralPath $dir) {
        $files += Get-ChildItem -LiteralPath $dir -Recurse -Filter '*.md' -File | ForEach-Object { $_.FullName }
    }
}
foreach ($f in @('MASTER.md', 'README.md', 'MANIFEST.md', 'AI_CONTEXT.md')) {
    $p = Join-Path $root $f
    if (Test-Path -LiteralPath $p) { $files += $p }
}

# ---------------------------------------------------------------------------
# 2. Références internes existantes
# ---------------------------------------------------------------------------
Write-Host "`n--- 2. References internes (.md) ---" -ForegroundColor Cyan
$refRegex = '(?:docs|PROJECT_RULES|WORKFLOW|TEMPLATES|PROMPTS|AGENTS|RELEASE|OUTPUT)/(?:[\w\-./]+\.md)'
$totalRefs = 0
foreach ($file in $files) {
    $rel = $file.Substring($root.Length + 1)
    $content = Get-Content -LiteralPath $file -Raw
    $matches = [regex]::Matches($content, $refRegex)
    foreach ($m in $matches) {
        $totalRefs++
        $target = Join-Path $root ($m.Value -replace '/', '\')
        if (-not (Test-Path -LiteralPath $target)) {
            Out-Fail "$rel -> $($m.Value) introuvable"
        }
    }
}
Out-Pass "$totalRefs references verifiees"

# ---------------------------------------------------------------------------
# 3. Identifiants définis vs référencés
# ---------------------------------------------------------------------------
Write-Host "`n--- 3. Identifiants (BR / SCR / CMP / UF / RG) ---" -ForegroundColor Cyan

$brFile = Join-Path $root 'docs\01-analysis\business-rules.md'
$brContent = Get-Content -LiteralPath $brFile -Raw
$brDefined = [regex]::Matches($brContent, '# BR-[A-Z]{3}-\d{3}') | ForEach-Object { $_.Value.Substring(2) }

$scrDefined = @()
$scrDir = Join-Path $root 'docs\02-design\screen-specifications'
Get-ChildItem -LiteralPath $scrDir -Filter '*.md' -File | ForEach-Object {
    $c = Get-Content -LiteralPath $_.FullName -Raw
    if ($c -match '(?m)^## Identifiant\s*\r?\n\s*(SCR-\d{3})') { $scrDefined += $Matches[1] }
}

$cmpDir = Join-Path $root 'docs\02-design\component-specifications'
$cmpDefined = Get-ChildItem -LiteralPath $cmpDir -Filter '*.md' -File | ForEach-Object {
    if ($_.Name -match '^(CMP-\d{3})') { $Matches[1] }
}

$ufFile = Join-Path $root 'docs\02-design\user-flows.md'
$ufContent = Get-Content -LiteralPath $ufFile -Raw
$ufDefined = [regex]::Matches($ufContent, 'UF-\d{3}') | ForEach-Object { $_.Value }

$rgDefined = [regex]::Matches($brContent, 'RG\d{1,2}') | ForEach-Object { $_.Value }

$refMap = @{
    'BR-[A-Z]{3}-\d{3}' = $brDefined
    'SCR-\d{3}'         = $scrDefined
    'CMP-\d{3}'         = $cmpDefined
    'UF-\d{3}'          = $ufDefined
    'RG\d{1,2}'         = $rgDefined
}

foreach ($file in $files) {
    $rel = $file.Substring($root.Length + 1)
    if ($rel -like 'docs\01-analysis\business-rules.md') { continue }
    $content = Get-Content -LiteralPath $file -Raw
    foreach ($pat in $refMap.Keys) {
        foreach ($m in [regex]::Matches($content, $pat)) {
            if ($refMap[$pat] -notcontains $m.Value) {
                Out-Fail "$rel -> $($m.Value) reference non defini"
            }
        }
    }
}
Out-Pass "Identifiants croises verifies"

# ---------------------------------------------------------------------------
# 4. Placeholders « à compléter » dans docs/
# ---------------------------------------------------------------------------
Write-Host "`n--- 4. Placeholders ('a completer') dans docs/ ---" -ForegroundColor Cyan
foreach ($file in $files) {
    if (-not $file.StartsWith((Join-Path $root 'docs'))) { continue }
    $rel = $file.Substring($root.Length + 1)
    $content = Get-Content -LiteralPath $file -Raw
    $count = [regex]::Matches($content, 'à compléter|a completer').Count
    if ($count -gt 0) { Out-Warn "$rel : $count occurrence(s) 'a completer'" }
}

# ---------------------------------------------------------------------------
# Bilan
# ---------------------------------------------------------------------------
Write-Host "`n=== Bilan : $pass PASS / $fail FAIL / $warn WARN ===" -ForegroundColor Cyan
if ($fail -gt 0) {
    Write-Host "Resultat : ECHEC" -ForegroundColor Red
    exit 1
}
Write-Host "Resultat : OK" -ForegroundColor Green
exit 0
