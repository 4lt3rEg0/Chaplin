param(
  [switch]$StartRadio,
  [switch]$KillConflicts,
  [int]$BackendPort = 8000,
  [int]$RadioPort = 8001,
  [int]$PreferredVitePort = 5173
)

$ErrorActionPreference = 'Stop'

function Get-ListeningPids([int]$Port) {
  try {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) { return @() }
    return @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
  }
  catch {
    $raw = netstat -ano | Select-String ":$Port\s+.*LISTENING\s+(\d+)$"
    if (-not $raw) { return @() }
    return @($raw.Matches.Groups[1].Value | Select-Object -Unique)
  }
}

function Test-PortFree([int]$Port) {
  return (Get-ListeningPids -Port $Port).Count -eq 0
}

function Stop-PortProcesses([int]$Port) {
  $listeningPids = Get-ListeningPids -Port $Port
  foreach ($processId in $listeningPids) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "[OK] Puerto $Port liberado (PID $processId detenido)."
    }
    catch {
      Write-Warning "No se pudo detener PID $processId en puerto ${Port}: $($_.Exception.Message)"
    }
  }
}

function Find-FreePort([int]$Start, [int]$End) {
  for ($p = $Start; $p -le $End; $p++) {
    if (Test-PortFree -Port $p) {
      return $p
    }
  }
  return $null
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot 'backend'
$frontendDir = Join-Path $repoRoot 'frontend/web'
$radioDir = Join-Path $repoRoot 'radio_server'
# El entorno virtual activo del proyecto es .venv-1 (raiz del repo, Python 3.13).
# backend/venv quedo invalido tras la migracion/limpieza de entornos y ya no existe.
$backendPython = Join-Path $repoRoot '.venv-1/Scripts/python.exe'

if (-not (Test-Path $backendPython)) {
  throw "No se encontro Python en: $backendPython (se esperaba el entorno .venv-1 en la raiz del proyecto)"
}

if (-not (Test-PortFree -Port $BackendPort)) {
  if ($KillConflicts) {
    Stop-PortProcesses -Port $BackendPort
  }
  else {
    $pids = Get-ListeningPids -Port $BackendPort
    throw "El puerto $BackendPort ya esta en uso por PID(s): $($pids -join ', '). Usa -KillConflicts para liberar."
  }
}

$backendCmd = "Set-Location '$backendDir'; & '$backendPython' -m uvicorn app.main:app --host 127.0.0.1 --port $BackendPort --reload"
Start-Process -FilePath powershell -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $backendCmd) | Out-Null
Write-Host "[OK] Backend iniciado en http://127.0.0.1:$BackendPort"

if ($StartRadio) {
  if (-not (Test-PortFree -Port $RadioPort)) {
    if ($KillConflicts) {
      Stop-PortProcesses -Port $RadioPort
    }
    else {
      $pids = Get-ListeningPids -Port $RadioPort
      throw "El puerto $RadioPort ya esta en uso por PID(s): $($pids -join ', '). Usa -KillConflicts o ejecuta sin -StartRadio."
    }
  }

  $radioCmd = "Set-Location '$radioDir'; & '$backendPython' main.py"
  Start-Process -FilePath powershell -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $radioCmd) | Out-Null
  Write-Host "[OK] Radio server iniciado en http://127.0.0.1:$RadioPort"
}

$vitePort = if (Test-PortFree -Port $PreferredVitePort) {
  $PreferredVitePort
} else {
  Find-FreePort -Start ($PreferredVitePort + 1) -End ($PreferredVitePort + 20)
}

if (-not $vitePort) {
  throw "No se encontro puerto libre para Vite entre $PreferredVitePort y $($PreferredVitePort + 20)."
}

$env:VITE_PORT = [string]$vitePort
$env:VITE_HOST = "0.0.0.0"
$env:VITE_STRICT_PORT = "true"
$env:VITE_API_TARGET = "http://127.0.0.1:$BackendPort"
$env:VITE_RADIO_TARGET = "http://127.0.0.1:$RadioPort"

Write-Host "[INFO] VITE_PORT=$($env:VITE_PORT)"
Write-Host "[INFO] VITE_HOST=$($env:VITE_HOST)"
Write-Host "[INFO] VITE_STRICT_PORT=$($env:VITE_STRICT_PORT)"
Write-Host "[INFO] VITE_API_TARGET=$($env:VITE_API_TARGET)"
Write-Host "[INFO] VITE_RADIO_TARGET=$($env:VITE_RADIO_TARGET)"

Set-Location $frontendDir
npm run dev
