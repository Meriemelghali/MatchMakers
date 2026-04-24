# Lancer les microservices Spring Boot (Teams + Rewards + Matchs + autres si besoin)
# Note: on force MAVEN_USER_HOME dans le repo pour eviter tout acces au profil Windows.
$m2 = (Resolve-Path ".\.m2").Path
$env:MAVEN_USER_HOME = $m2

function Get-MavenCmd() {
  $dists = Join-Path $m2 "wrapper\\dists"
  if (Test-Path $dists) {
    $cmd = Get-ChildItem -Path $dists -Recurse -Filter "mvn.cmd" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) { return $cmd.FullName }
  }
  return $null
}

$mvn = Get-MavenCmd
$mvnPart = if ($mvn) { "& `"$mvn`" -f pom.xml spring-boot:run" } else { ".\\mvnw.cmd spring-boot:run" }

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location 'Backend\TeamService'; $mvnPart"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location 'Backend\RewardService'; $mvnPart"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location 'Backend\MatchService'; $mvnPart"

# Optionnel: autres services du projet
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location 'Backend\UserService'; $mvnPart"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location 'Backend\EventCompetitionService'; $mvnPart"

# Lancer le frontend Angular
# Note: on bypass npm et on execute Angular CLI directement (utile si npm est bloque par le profil utilisateur).
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd Frontend; node .\\node_modules\\@angular\\cli\\bin\\ng.js serve --configuration development --port 4200"
