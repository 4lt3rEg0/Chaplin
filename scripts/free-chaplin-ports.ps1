param(
  [int[]]$Ports = @(8000, 5173)
)

# Libera los puertos de desarrollo de Chaplin antes de arrancar, distinguiendo
# un proceso real de un "socket fantasma": una entrada LISTENING que sigue
# apareciendo en Get-NetTCPConnection/netstat despues de que el proceso que
# la creo ya fue matado. Se ha visto repetidamente con uvicorn --reload en
# Windows (el reloader reparte el socket con su worker via multiprocessing;
# un taskkill -F externo a veces no libera el handle limpiamente). No hay
# forma de arreglar esa entrada desde aqui - solo un reinicio de Windows la
# limpia del todo - pero SI podemos evitar que bloquee el arranque cada vez.

$ErrorActionPreference = 'Continue'

function Get-ListeningPids([int]$Port) {
  try {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) { return @() }
    return @($conns | Select-Object -ExpandProperty OwningProcess -Unique)
  }
  catch {
    return @()
  }
}

function Test-ProcessAlive([int]$ProcessId) {
  return [bool](Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

foreach ($port in $Ports) {
  $listeningPids = Get-ListeningPids -Port $port
  if (-not $listeningPids) {
    Write-Host "[OK] Puerto $port libre."
    continue
  }

  foreach ($procId in $listeningPids) {
    if (Test-ProcessAlive -ProcessId $procId) {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      Write-Host "[OK] Puerto $port liberado (PID $procId detenido)."
    }
  }

  Start-Sleep -Milliseconds 800
  $stillListed = Get-ListeningPids -Port $port
  if ($stillListed) {
    $reallyAlive = @($stillListed | Where-Object { Test-ProcessAlive -ProcessId $_ })
    if ($reallyAlive.Count -gt 0) {
      Write-Warning "Puerto $port sigue ocupado por proceso(s) real(es): $($reallyAlive -join ', ') - revisalo a mano."
    }
    else {
      Write-Warning "Puerto $port muestra un registro fantasma (PID $($stillListed -join ', ') ya no existe). Windows a veces deja bindear un proceso nuevo en el mismo puerto de todos modos, pero las respuestas pueden venir mezcladas con el proceso fantasma (visto en vivo: timestamps y datos de un proceso ya muerto). Si algo responde raro despues de arrancar, NO confies en ese puerto - reinicia Windows para limpiar la entrada del todo, o arranca en otro puerto mientras tanto."
    }
  }
}
