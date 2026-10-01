# Generate ONE image with Codex CLI's built-in image_gen tool and save it to $Out.
#
# Source: adapted from pblsketch/sori-haejeon tools/gen.ps1 (same author, series tool).
# Changes for this game:
#   - isolated CODEX_HOME under %TEMP% (never the global ~/.codex): only config.toml + a copy of auth.json.
#     The global home loads plugins/MCP and can stall for minutes.
#   - the whole prompt is passed INLINE in the exec argument. The codex sandbox blocks reading local
#     files, so asking codex to read the prompt file makes generation fail.
#   - stdin is closed (piped $null) so codex never waits for input.
#   - a stamp file is touched before each run; only a PNG newer than the stamp is copied.
#   - hard timeout (-TimeoutSec); only the codex process started here is stopped on timeout.
#   - no reference-image mode (not needed for the style samples).
# This file is kept pure ASCII on purpose: Windows PowerShell 5.1 misreads non-ASCII in BOM-less scripts.
#
# Usage (repo root, PowerShell):
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\gen.ps1 -Name style_a -PromptFile tools\prompts\style_a.txt -Out assets\raw\style_a.png
# Prompts must be English ASCII only (they go straight into the command line).
param(
  [Parameter(Mandatory=$true)][string]$Name,
  [Parameter(Mandatory=$true)][string]$PromptFile,
  [Parameter(Mandatory=$true)][string]$Out,
  [string]$Size = "1536x1024",
  [string]$Quality = "high",
  [string]$Model = "gpt-6-astra",
  [string]$Effort = "medium",
  [int]$TimeoutSec = 900
)
$ErrorActionPreference = "Continue"

# Prefer the newest codex.exe bundled with the desktop app, else codex on PATH.
$codex = Get-ChildItem "$env:LOCALAPPDATA\OpenAI\Codex\bin" -Recurse -Filter codex.exe -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
if (-not $codex) { $codex = (Get-Command codex -ErrorAction SilentlyContinue).Source }
if (-not $codex) { "ERROR codex.exe not found"; exit 2 }

$auth = Join-Path $env:USERPROFILE ".codex\auth.json"
if (-not (Test-Path -LiteralPath $auth)) { "ERROR $auth not found (run codex login first)"; exit 2 }

# Isolated CODEX_HOME (ASCII path under %TEMP%, outside the repo).
$ch = Join-Path $env:TEMP ("codex-img-eumun-" + $Name)
New-Item -ItemType Directory -Force $ch | Out-Null
Set-Content -LiteralPath (Join-Path $ch "config.toml") -Encoding ascii -Value @"
model = "$Model"
approval_policy = "never"
sandbox_mode = "workspace-write"
"@
Copy-Item -LiteralPath $auth -Destination (Join-Path $ch "auth.json") -Force

$prompt = (Get-Content -LiteralPath $PromptFile -Encoding UTF8 -Raw).Replace('"', "'").Trim()
if ($prompt -match '[^\x00-\x7F]') { "WARN $Name : prompt has non-ASCII characters" }

$instr = "Use the built-in image_gen tool to generate exactly 1 image, size $Size, quality $Quality, using the following prompt verbatim. Do not run shell commands and do not read any files. Then print only DONE.`n`n$prompt"

# Stamp: only images written after this point count.
$stamp = Join-Path $ch "stamp.txt"
Set-Content -LiteralPath $stamp -Value (Get-Date -Format o) -Encoding ascii
$before = (Get-Item -LiteralPath $stamp).LastWriteTime
Start-Sleep -Seconds 1

$log = Join-Path $ch "log.txt"
$env:CODEX_HOME = $ch
$job = Start-Job -ScriptBlock {
  param($codex, $instr, $ch, $effort, $log, $home2)
  $env:CODEX_HOME = $home2
  $null | & $codex exec $instr -C $ch --skip-git-repo-check -c "model_reasoning_effort=`"$effort`"" *> $log
  $LASTEXITCODE
} -ArgumentList $codex, $instr, $ch, $Effort, $log, $ch

if (-not (Wait-Job $job -Timeout $TimeoutSec)) {
  "TIMEOUT $Name after $TimeoutSec s"
  # Stop only the codex processes whose CODEX_HOME is ours (children of this job).
  Get-CimInstance Win32_Process -Filter "Name='codex.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($ch) } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Stop-Job $job -ErrorAction SilentlyContinue
}
$code = Receive-Job $job -ErrorAction SilentlyContinue
Remove-Job $job -Force -ErrorAction SilentlyContinue
"codex exit: $code"
if (Test-Path -LiteralPath $log) { Get-Content -LiteralPath $log -Tail 3 }

$latest = Get-ChildItem -Recurse (Join-Path $ch "generated_images") -Filter *.png -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -gt $before } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($latest) {
  $dir = Split-Path $Out
  if ($dir) { New-Item -ItemType Directory -Force $dir | Out-Null }
  Copy-Item -LiteralPath $latest.FullName -Destination $Out -Force
  "SAVED $Name -> $Out"
  exit 0
} else {
  "NO_IMAGE $Name"
  exit 1
}
