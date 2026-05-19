param(
  [int]$Port = 3000,
  [switch]$Once
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
$NodeExe = if ($NodeCommand) { $NodeCommand.Source } else { $null }
$Url = "http://localhost:$Port/"
$script:ServerProcess = $null

function Write-Header {
  Clear-Host
  Write-Host "Warzone Card Game - Local Service Console" -ForegroundColor Cyan
  Write-Host "Project root: $ProjectRoot"
  Write-Host "Service URL:  $Url"
  Write-Host ""
}

function Get-PortOwner {
  try {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($connection) {
      return Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    }
  } catch {
    $line = netstat -ano | Select-String -Pattern ":$Port\s+.*LISTENING" | Select-Object -First 1
    if ($line -and ($line.Line -match "\s+(\d+)\s*$")) {
      return Get-Process -Id ([int]$Matches[1]) -ErrorAction SilentlyContinue
    }
  }
  return $null
}

function Test-ManagedServiceRunning {
  return [bool]($script:ServerProcess -and -not $script:ServerProcess.HasExited)
}

function Show-Status {
  $owner = Get-PortOwner
  if (Test-ManagedServiceRunning) {
    Write-Host "Status: running, managed by this window, PID $($script:ServerProcess.Id)" -ForegroundColor Green
  } elseif ($owner) {
    Write-Host "Status: port $Port is already used by $($owner.ProcessName), PID $($owner.Id)" -ForegroundColor Yellow
  } else {
    Write-Host "Status: stopped" -ForegroundColor Gray
  }
}

function Start-LocalService {
  if (-not $NodeExe) {
    Write-Host "Node.js was not found. Install Node.js or add node to PATH first." -ForegroundColor Red
    return $false
  }
  if (Test-ManagedServiceRunning) {
    Write-Host "Service is already running in this window." -ForegroundColor Yellow
    return $true
  }

  $owner = Get-PortOwner
  if ($owner) {
    Write-Host "Port $Port is already used by $($owner.ProcessName), PID $($owner.Id)." -ForegroundColor Yellow
    Write-Host "If this is an old local service, press K to stop the port owner."
    return $false
  }

  Write-Host "Starting local service..." -ForegroundColor Cyan
  $script:ServerProcess = Start-Process -FilePath $NodeExe -ArgumentList "server.js" -WorkingDirectory $ProjectRoot -NoNewWindow -PassThru
  Start-Sleep -Milliseconds 900
  if (-not (Test-ManagedServiceRunning)) {
    Write-Host "Service failed to start; the node process has exited." -ForegroundColor Red
    return $false
  }
  Write-Host "Service started: $Url" -ForegroundColor Green
  return $true
}

function Stop-LocalService {
  if (-not (Test-ManagedServiceRunning)) {
    Write-Host "No service process is managed by this window." -ForegroundColor Yellow
    return
  }
  Write-Host "Stopping service PID $($script:ServerProcess.Id)..." -ForegroundColor Cyan
  Stop-Process -Id $script:ServerProcess.Id -Force -ErrorAction SilentlyContinue
  $script:ServerProcess.WaitForExit(3000) | Out-Null
  $script:ServerProcess = $null
  Write-Host "Service stopped." -ForegroundColor Green
}

function Stop-PortOwner {
  $owner = Get-PortOwner
  if (-not $owner) {
    Write-Host "Port $Port is not currently used." -ForegroundColor Gray
    return
  }
  if (Test-ManagedServiceRunning -and $owner.Id -eq $script:ServerProcess.Id) {
    Stop-LocalService
    return
  }

  Write-Host "This will stop the process using port ${Port}: $($owner.ProcessName) PID $($owner.Id)" -ForegroundColor Yellow
  $confirm = Read-Host "Type Y to confirm"
  if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "Cancelled."
    return
  }
  Stop-Process -Id $owner.Id -Force -ErrorAction SilentlyContinue
  Write-Host "Port owner stopped." -ForegroundColor Green
}

function Restart-LocalService {
  if (Test-ManagedServiceRunning) {
    Stop-LocalService
  }
  Start-LocalService | Out-Null
}

function Open-LocalUrl {
  Start-Process $Url
}

function Invoke-HealthCheck {
  $deadline = (Get-Date).AddSeconds(8)
  do {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  } while ((Get-Date) -lt $deadline)
  return $false
}

function Run-Once {
  if (-not (Start-LocalService)) {
    exit 1
  }
  $ok = Invoke-HealthCheck
  Stop-LocalService
  if ($ok) {
    Write-Host "One-shot startup check passed." -ForegroundColor Green
    exit 0
  }
  Write-Host "One-shot startup check failed: cannot reach $Url" -ForegroundColor Red
  exit 1
}

function Show-Menu {
  Write-Host ""
  Write-Host "[S] Start  [T] Stop  [R] Restart  [O] Open browser  [K] Stop port owner  [Q] Quit"
  Write-Host "Keep this window open to keep the service running. Press T or Q to stop it."
}

if ($Once) {
  Run-Once
}

try {
  Write-Header
  Start-LocalService | Out-Null

  while ($true) {
    Write-Host ""
    Show-Status
    Show-Menu
    $key = [Console]::ReadKey($true).KeyChar.ToString().ToUpperInvariant()
    switch ($key) {
      "S" {
        Start-LocalService | Out-Null
      }
      "T" {
        Stop-LocalService
      }
      "R" {
        Restart-LocalService
      }
      "O" {
        Open-LocalUrl
      }
      "K" {
        Stop-PortOwner
      }
      "Q" {
        Stop-LocalService
        break
      }
      default {
        Write-Host "Unknown command: $key" -ForegroundColor Yellow
      }
    }
  }
} finally {
  if (Test-ManagedServiceRunning) {
    Stop-LocalService
  }
}
