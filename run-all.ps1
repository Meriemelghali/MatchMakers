# Lancer les microservices Spring Boot (Teams + Rewards + Matchs + autres si besoin)
# Note: on force MAVEN_USER_HOME dans le repo pour eviter tout acces au profil Windows.
$m2 = (Resolve-Path ".\\.m2").Path

Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd Backend\\TeamService; `$env:MAVEN_USER_HOME='$m2'; .\\mvnw.cmd spring-boot:run"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd Backend\\RewardService; `$env:MAVEN_USER_HOME='$m2'; .\\mvnw.cmd spring-boot:run"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd Backend\\MatchService; `$env:MAVEN_USER_HOME='$m2'; .\\mvnw.cmd spring-boot:run"

# Optionnel: autres services du projet
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd Backend\\UserService; `$env:MAVEN_USER_HOME='$m2'; .\\mvnw.cmd spring-boot:run"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd Backend\\EventCompetitionService; `$env:MAVEN_USER_HOME='$m2'; .\\mvnw.cmd spring-boot:run"

# Lancer le frontend Angular
# Note: on bypass npm et on execute Angular CLI directement (utile si npm est bloque par le profil utilisateur).
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd Frontend; node .\\node_modules\\@angular\\cli\\bin\\ng.js serve --configuration development --port 4200"
