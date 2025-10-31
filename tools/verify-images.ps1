$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Split-Path -Parent $root

$singleLetter = Join-Path $repo 'src\scripts\data\words\singleLetter.js'
$pairs = Join-Path $repo 'src\scripts\data\words\pairs.js'
$imgDir = Join-Path $repo 'src\images'

# Collect words from JS object literals (correct/incorrect arrays)
$words = New-Object System.Collections.Generic.HashSet[string]

function Collect-Words([string]$file) {
  $txt = Get-Content -LiteralPath $file -Raw -Encoding UTF8
  $rxArr = New-Object System.Text.RegularExpressions.Regex('(?:correct|incorrect)\s*:\s*\[(.*?)\]','Singleline')
  # Use double-quoted PowerShell string for regex so inner single quotes parse correctly in PS 5.1
  $rxStr = New-Object System.Text.RegularExpressions.Regex("'([^']+)'","Singleline")
  foreach ($m in $rxArr.Matches($txt)) {
    foreach ($m2 in $rxStr.Matches($m.Groups[1].Value)) {
      [void]$words.Add($m2.Groups[1].Value)
    }
  }
}

Collect-Words -file $singleLetter
Collect-Words -file $pairs

function Normalize([string]$w) {
  $n = $w.ToLower().Replace(' ', '')
  if ($n -eq 'жираф') { return 'жирафа.png' }
  # Fallback in case input normalization yields the filename directly
  if ((($n + '.png')) -eq 'жираф.png') { return 'жирафа.png' }
  return ($n + '.png')
}

$required = $words | ForEach-Object { Normalize $_ } | Sort-Object -Unique
$present = Get-ChildItem -LiteralPath $imgDir -File | Select-Object -ExpandProperty Name

$presentSet = New-Object System.Collections.Generic.HashSet[string] ([StringComparer]::OrdinalIgnoreCase)
foreach ($n in $present) { [void]$presentSet.Add($n) }
$reqSet = New-Object System.Collections.Generic.HashSet[string] ([StringComparer]::OrdinalIgnoreCase)
foreach ($r in $required) { [void]$reqSet.Add($r) }

$missing = @()
foreach ($r in $required) { if (-not $presentSet.Contains($r)) { $missing += $r } }
$unused = @()
foreach ($p in $present) { if (-not $reqSet.Contains($p)) { $unused += $p } }

'=== Missing images (required by words, not found) ==='
if ($missing.Count -eq 0) { 'None' } else { $missing | Sort-Object }
''
'=== Unused images (present, but not referenced by words) ==='
if ($unused.Count -eq 0) { 'None' } else { $unused | Sort-Object }
