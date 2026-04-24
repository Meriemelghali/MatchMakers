$ErrorActionPreference = "Stop"

# Run the full stack (all Spring microservices + Angular frontend + PythonAI).
# Logs: .logs/<Service>.log
#
# Notes:
# - Some services may require extra infra (RabbitMQ, etc.). We still try to start everything.
# - MongoDB is assumed available at localhost:27017 (or configure env vars for Atlas as needed).

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$logs = Join-Path $root ".logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null

$m2 = Join-Path $root ".m2"
$tmp = Join-Path $root ".tmp"
$pipCache = Join-Path $root ".pip-cache"
New-Item -ItemType Directory -Force -Path $m2, $tmp, $pipCache | Out-Null
$env:MAVEN_USER_HOME = $m2

function Get-MavenCmd() {
  $dists = Join-Path $m2 "wrapper\\dists"
  if (Test-Path $dists) {
    $cmd = Get-ChildItem -Path $dists -Recurse -Filter "mvn.cmd" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) { return $cmd.FullName }
  }
  return $null
}

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

    # Stop only processes likely started by this stack.
    if ($name -in @('java', 'node', 'python', 'pythonw')) {
      "Stopping PID $procId ($($p.ProcessName)) on port $port" | Out-Host
      try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } catch {}
    }
  }
}

function Wait-Port([int]$port, [int]$seconds = 120) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $iar = $client.BeginConnect("127.0.0.1", $port, $null, $null)
      $ok = $iar.AsyncWaitHandle.WaitOne(400)
      if ($ok -and $client.Connected) { $client.Close(); return $true }
      $client.Close()
    } catch {}
    Start-Sleep -Milliseconds 600
  }
  return $false
}

function Start-Svc([string]$name, [string]$dir) {
  $out = Join-Path $logs "$name.log"
  $err = Join-Path $logs "$name.err.log"
  Remove-Item -Force $out, $err -ErrorAction SilentlyContinue
  "Starting $name ... log: $out" | Out-Host
  $mvn = Get-MavenCmd
  if ($mvn) {
    $cmd = "Set-Location `"$dir`"; & `"$mvn`" -f pom.xml spring-boot:run"
  } else {
    $cmd = "Set-Location `"$dir`"; .\\mvnw.cmd spring-boot:run"
  }
  Start-Process -WindowStyle Hidden -FilePath powershell -ArgumentList "-NoProfile", "-Command", $cmd `
    -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
}

function Start-Frontend() {
  $out = Join-Path $logs "Frontend.log"
  $err = Join-Path $logs "Frontend.err.log"
  Remove-Item -Force $out, $err -ErrorAction SilentlyContinue
  "Starting Frontend ... log: $out" | Out-Host
  $dir = Join-Path $root "Frontend"
  $cmd = @"
cd "$dir"
if (!(Test-Path ".\\node_modules")) { npm ci }
node .\\node_modules\\@angular\\cli\\bin\\ng.js serve --configuration development --host 127.0.0.1 --port 4200
"@
  Start-Process -WindowStyle Hidden -FilePath powershell -ArgumentList "-NoProfile", "-Command", $cmd `
    -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
}

function Start-PythonAi() {
  $dir = Join-Path $root "PythonAI"
  if (-not (Test-Path $dir)) { return }

  $out = Join-Path $logs "PythonAI.log"
  $err = Join-Path $logs "PythonAI.err.log"
  Remove-Item -Force $out, $err -ErrorAction SilentlyContinue
  "Starting PythonAI ... log: $out" | Out-Host

  $venvPy = Join-Path $dir ".venv\\Scripts\\python.exe"
  if (-not (Test-Path $venvPy)) {
    powershell -NoProfile -Command ("cd `"$dir`"; python -m venv .venv") | Out-Null
  }

  # Load optional env file (ignored by git). See PythonAI/.env.example
  $envFile = Join-Path $dir ".env"
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      $line = [string]$_
      if ($null -eq $line) { $line = "" }
      $line = $line.Trim()
      if (-not $line -or $line.StartsWith('#')) { return }
      $eq = $line.IndexOf('=')
      if ($eq -lt 1) { return }
      $key = $line.Substring(0, $eq).Trim()
      $val = $line.Substring($eq + 1).Trim()
      if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
        $val = $val.Substring(1, $val.Length - 2)
      }
      if ($key) { Set-Item -Path ("Env:{0}" -f $key) -Value $val }
    }
  }

  # deps once (avoid restricted user temp)
  $req = Join-Path $dir "requirements.txt"
  $reqHash = if (Test-Path $req) { (Get-FileHash $req -Algorithm SHA256).Hash.Substring(0, 12) } else { "none" }
  $sentinel = Join-Path $dir (".venv\\.deps_ok_{0}" -f $reqHash)
  if (-not (Test-Path $sentinel)) {
    $env:TEMP = $tmp
    $env:TMP = $tmp
    $env:PIP_CACHE_DIR = $pipCache
    & $venvPy -m pip install --disable-pip-version-check -r $req *>> $out
    New-Item -ItemType File -Force -Path $sentinel | Out-Null
  }

  Start-Process -WindowStyle Hidden -WorkingDirectory $dir -FilePath $venvPy `
    -ArgumentList "-m","uvicorn","app:app","--host","0.0.0.0","--port","8001" `
    -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
}

function Start-EventTypeAi() {
  $dir = Join-Path $root "PEventAIService"
  if (-not (Test-Path $dir)) { return }

  $out = Join-Path $logs "PEventAI.log"
  $err = Join-Path $logs "PEventAI.err.log"
  Remove-Item -Force $out, $err -ErrorAction SilentlyContinue
  "Starting PEventAIService ... log: $out" | Out-Host

  $venvPy = Join-Path $dir ".venv\\Scripts\\python.exe"
  if (-not (Test-Path $venvPy)) {
    powershell -NoProfile -Command ("cd `"$dir`"; python -m venv .venv") | Out-Null
  }

  $sentinel = Join-Path $dir ".venv\\.deps_ok"
  if (-not (Test-Path $sentinel)) {
    $env:TEMP = $tmp
    $env:TMP = $tmp
    $env:PIP_CACHE_DIR = $pipCache
    & $venvPy -m pip install --disable-pip-version-check -r (Join-Path $dir "requirements.txt") *>> $out
    New-Item -ItemType File -Force -Path $sentinel | Out-Null
  }

  Start-Process -WindowStyle Hidden -WorkingDirectory $dir -FilePath $venvPy `
    -ArgumentList "-m","uvicorn","main:app","--host","0.0.0.0","--port","8002" `
    -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
}

# Clean ports (avoid "Address already in use")
foreach ($p in @(8081,8082,8083,8084,8085,8086,8087,8088,8089,8090,8091,8092,4200,8001,8002)) { Stop-PortIfSafe $p }

# Start all Spring services
Start-Svc "UserService" (Join-Path $root "Backend\\UserService")
Start-Svc "ReclamationService" (Join-Path $root "Backend\\ReclamationService")
Start-Svc "EventCompetitionService" (Join-Path $root "Backend\\EventCompetitionService")
Start-Svc "SportService" (Join-Path $root "Backend\\SportService")
Start-Svc "TeamService" (Join-Path $root "Backend\\TeamService")
Start-Svc "RewardService" (Join-Path $root "Backend\\RewardService")
Start-Svc "MatchService" (Join-Path $root "Backend\\MatchService")
Start-Svc "TerrainService" (Join-Path $root "Backend\\TerrainService")
Start-Svc "ReservationService" (Join-Path $root "Backend\\ReservationService")
Start-Svc "SocialService" (Join-Path $root "Backend\\SocialService")
Start-Svc "FinanceService" (Join-Path $root "Backend\\FinanceService")
Start-Svc "ProductService" (Join-Path $root "Backend\\ProductService")

# Wait a bit for ports to open
$services = @(
  @{ name="users"; port=8081 },
  @{ name="reclamations"; port=8082 },
  @{ name="events"; port=8083 },
  @{ name="sports"; port=8084 },
  @{ name="teams"; port=8085 },
  @{ name="rewards"; port=8086 },
  @{ name="matchs"; port=8087 },
  @{ name="terrain"; port=8088 },
  @{ name="reservations"; port=8089 },
  @{ name="social"; port=8090 },
  @{ name="finance"; port=8091 },
  @{ name="products"; port=8092 }
)

foreach ($s in $services) {
  $ok = Wait-Port $s.port 180
  "READY $($s.name) port=$($s.port) ok=$ok" | Out-Host
}

# Start UI + PythonAI + EventTypeAI
Start-Frontend
Start-PythonAi
Start-EventTypeAi

"UI: http://127.0.0.1:4200" | Out-Host
"PythonAI: http://127.0.0.1:8001/health" | Out-Host
"EventTypeAI: http://127.0.0.1:8002/docs" | Out-Host

