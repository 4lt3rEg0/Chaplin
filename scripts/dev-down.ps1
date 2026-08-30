param(
  [int]$BackendPort = 8000,
  [int]$RadioPort = 8001,
  [switch]$StopVite
)

# Stops Chaplin's own dev processes by PORT ASSOCIATION only — never a blanket
# `taskkill /IM python.exe`, which would also kill unrelated Python processes
# elsewhere on the machine. uvicorn's own reload supervisor can leave orphaned
# `multiprocessing.spawn` worker children behind a killed parent (seen during
# CHAPLIN BETA HARDENING V5/V6 QA), so this stops whatever is actually LISTENING
# on the port rather than trying to track a specific PID tree.

$ErrorActionPreference = 'Stop'

function Stop-PortListener([int]$Port, [string]$Label) {
  $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $conns) {
    Write-Host "[OK] $Label (puerto $Port) no estaba corriendo."
    return
  }
  foreach ($processId in ($conns | Select-Object -ExpandProperty OwningProcess -Unique)) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "[OK] $Label detenido (PID $processId, puerto $Port)."
    }
    catch {
      Write-Warning "No se pudo detener PID $processId en puerto $Port ($Label): $($_.Exception.Message)"
    }
  }
}

Stop-PortListener -Port $BackendPort -Label "Backend"
Stop-PortListener -Port $RadioPort -Label "Radio server"

if ($StopVite) {
  # Vite's dev port isn't fixed (dev-up.ps1 auto-picks a free one), so this
  # only covers the common default — pass the real port explicitly if it
  # picked a different one.
  Stop-PortListener -Port 5173 -Label "Vite dev server"
}

Write-Host "[INFO] Si un puerto sigue en estado FinWait2/TimeWait en Get-NetTCPConnection, es normal — el proceso ya murio y el socket se esta liberando."
