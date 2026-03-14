# Lancer tous les microservices Spring Boot
Start-Process powershell -ArgumentList '-NoExit', '-Command',"cd Backend/UserService; ./mvnw spring-boot:run"
Start-Process powershell -ArgumentList '-NoExit', '-Command',"cd Backend/EventCompetitionService; ./mvnw spring-boot:run"



# Lancer le frontend Angular
Start-Process powershell -ArgumentList '-NoExit', '-Command',"cd Frontend; npm start"