$ErrorActionPreference = "Stop"

# Starts only: TeamService (8085), RewardService (8086) + Frontend (4200).
# For auth/login, start UserService separately on 8081.
# Logs are written under .logs/

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$logs = Join-Path $root ".logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null

$m2 = Join-Path $root ".m2"
New-Item -ItemType Directory -Force -Path $m2 | Out-Null
$env:MAVEN_USER_HOME = $m2

function Get-PortPids([int]$port) {
  $lines = netstat -ano | Select-String (":$port") | ForEach-Object { $_.ToString().Trim() }
  $pids = @()
  foreach ($l in $lines) {
    $tok = ($l -split '\s+')
    $procPid = $tok[-1]
    if ($procPid -match '^\d+$') { $pids += [int]$procPid }
  }
  $pids | Select-Object -Unique
}

function Stop-PortIfSafe([int]$port) {
  $pids = Get-PortPids $port
  foreach ($procId in $pids) {
    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if (-not $p) { continue }
    $name = ($p.ProcessName ?? "").ToLowerInvariant()
    if ($name -in @('java', 'node', 'python', 'pythonw')) {
      "Stopping PID $procId ($($p.ProcessName)) on port $port" | Out-Host
      try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } catch {}
    } else {
      "Port $port is in use by PID $procId ($($p.ProcessName)) - not stopping (unknown process)." | Out-Host
    }
  }
}

function Start-Svc([string]$name, [string]$dir) {
  $out = Join-Path $logs "$name.log"
  "Starting $name ... log: $out" | Out-Host
  $cmd = "Set-Location `"$dir`"; .\\mvnw.cmd spring-boot:run *>> `"$out`""
  Start-Process -WindowStyle Hidden -FilePath powershell -ArgumentList "-NoProfile", "-Command", $cmd | Out-Null
}

function Wait-Url([string]$url, [int]$seconds = 120) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-RestMethod $url -Method Get -TimeoutSec 2 | Out-Null
      return $true
    } catch {
      Start-Sleep -Milliseconds 700
    }
  }
  return $false
}

function Start-Frontend() {
  $dir = Join-Path $root "Frontend"
  $out = Join-Path $logs "Frontend.log"
  "Starting Frontend ... log: $out" | Out-Host

  $cmd = @"
cd "$dir"
if (!(Test-Path ".\\node_modules")) { npm ci }
node .\\node_modules\\@angular\\cli\\bin\\ng.js serve --configuration development --port 4200 *>> "$out"
"@

  Start-Process -WindowStyle Hidden -FilePath powershell -ArgumentList "-NoProfile", "-Command", $cmd | Out-Null
}

# Clean ports (avoid "Address already in use")
Stop-PortIfSafe 8085
Stop-PortIfSafe 8086
Stop-PortIfSafe 4200

Start-Svc "TeamService"   (Join-Path $root "Backend\\TeamService")
Start-Svc "RewardService" (Join-Path $root "Backend\\RewardService")

$okTeams   = Wait-Url "http://localhost:8085/teams/api/teams" 180
$okRewards = Wait-Url "http://localhost:8086/rewards/api/rewards" 180
"READY: teams=$okTeams rewards=$okRewards" | Out-Host

Start-Frontend
"Open UI: http://localhost:4200" | Out-Host
"Auth/login: start UserService (http://localhost:8081/users/auth/login) then refresh the UI." | Out-Host

