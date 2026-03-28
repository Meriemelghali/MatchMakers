$ErrorActionPreference = "Stop"

# Core services for the app screens: Teams, Rewards, Matchs, Terrain + Frontend + (optional) PythonAI.
# Logs are written under .logs/

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$logs = Join-Path $root ".logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null

$m2 = Join-Path $root ".m2"
$tmp = Join-Path $root ".tmp"
$pipCache = Join-Path $root ".pip-cache"
New-Item -ItemType Directory -Force -Path $tmp, $pipCache | Out-Null

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
    $pname = ""
    if ($p.ProcessName) { $pname = $p.ProcessName }
    $name = $pname.ToLowerInvariant()

    # We only stop processes that are very likely part of this project run.
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
  $cmd = "cd `"$dir`"; `$env:MAVEN_USER_HOME=`"$m2`"; .\\mvnw.cmd spring-boot:run *>> `"$out`""
  Start-Process -WindowStyle Hidden -FilePath powershell -ArgumentList "-NoProfile", "-Command", $cmd | Out-Null
}

function Wait-Url([string]$url, [int]$seconds = 90) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-RestMethod $url -Method Get -TimeoutSec 2 | Out-Null
      return $true
    } catch {
      Start-Sleep -Milliseconds 600
    }
  }
  return $false
}

function Start-Frontend() {
  $out = Join-Path $logs "Frontend.log"
  "Starting Frontend ... log: $out" | Out-Host
  $cmd = "cd `"$root\\Frontend`"; node .\\node_modules\\@angular\\cli\\bin\\ng.js serve --configuration development --port 4200 *>> `"$out`""
  Start-Process -WindowStyle Hidden -FilePath powershell -ArgumentList "-NoProfile", "-Command", $cmd | Out-Null
}

function Start-PythonAi() {
  $dir = Join-Path $root "PythonAI"
  if (-not (Test-Path $dir)) {
    "PythonAI folder not found, skipping." | Out-Host
    return
  }
  $out = Join-Path $logs "PythonAI.log"
  $err = Join-Path $logs "PythonAI.err.log"
  "Starting PythonAI ... log: $out" | Out-Host

  $venvPy = Join-Path $dir ".venv\\Scripts\\python.exe"
  if (-not (Test-Path $venvPy)) {
    # Create venv with system python (must exist on the machine).
    $cmdVenv = "cd `"$dir`"; python -m venv .venv"
    powershell -NoProfile -Command $cmdVenv | Out-Null
  }

  Remove-Item -Force $out -ErrorAction SilentlyContinue
  Remove-Item -Force $err -ErrorAction SilentlyContinue

  # Ensure dependencies are installed once (avoid writing to restricted user temp).
  $sentinel = Join-Path $dir ".venv\\.deps_ok"
  if (-not (Test-Path $sentinel)) {
    $env:TEMP = $tmp
    $env:TMP = $tmp
    $env:PIP_CACHE_DIR = $pipCache
    & $venvPy -m pip install --disable-pip-version-check -r (Join-Path $dir "requirements.txt") *>> $out
    New-Item -ItemType File -Force -Path $sentinel | Out-Null
  }

  # Start uvicorn in background.
  Start-Process -WindowStyle Hidden -WorkingDirectory $dir -FilePath $venvPy `
    -ArgumentList "-m","uvicorn","app:app","--host","0.0.0.0","--port","8001" `
    -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
}

# Clean ports (avoid "Address already in use")
Stop-PortIfSafe 8085
Stop-PortIfSafe 8086
Stop-PortIfSafe 8087
Stop-PortIfSafe 8088
Stop-PortIfSafe 4200
Stop-PortIfSafe 8001

# Start core Spring services
Start-Svc "TeamService"   (Join-Path $root "Backend\\TeamService")
Start-Svc "RewardService" (Join-Path $root "Backend\\RewardService")
Start-Svc "MatchService"  (Join-Path $root "Backend\\MatchService")
Start-Svc "TerrainService" (Join-Path $root "Backend\\TerrainService")

# Wait for core endpoints
$okTeams   = Wait-Url "http://localhost:8085/teams/api/teams" 120
$okRewards = Wait-Url "http://localhost:8086/rewards/api/rewards" 120
$okMatchs  = Wait-Url "http://localhost:8087/matchs" 120
$okTerrain = Wait-Url "http://localhost:8088/terrain" 120

"READY: teams=$okTeams rewards=$okRewards matchs=$okMatchs terrain=$okTerrain" | Out-Host

# Start Frontend + optional AI
Start-Frontend
Start-PythonAi

"Open UI: http://localhost:4200" | Out-Host
"If you want free AI: install Ollama, run `ollama serve`, then `ollama pull llama3.1:8b`." | Out-Host
