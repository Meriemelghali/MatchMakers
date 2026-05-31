# Documentation — Services consommés par le Frontend (Angular)

Ce document décrit **tous les services HTTP utilisés côté Frontend**, où ils se trouvent dans le code, leurs **URLs de base**, les **endpoints appelés**, et le **passage Backend → Frontend** (avec focus sur le module Récompenses).

## 1) Configuration des URLs (environments)

Fichier principal (dev) : `Frontend/src/environments/environment.ts`

- `userServiceUrl`: `http://localhost:8081`
- `sportServiceUrl`: `http://localhost:8084/sports`
- `eventServiceUrl`: `http://localhost:8083/eventsCompetitions`
- `matchServiceUrl`: `http://localhost:8087/matchs`
- `socialServiceUrl`: `http://localhost:8090/social/api/posts` (NB: pas utilisé par `SocialService` qui hardcode une autre base)
- `reservationServiceUrl`: `http://localhost:8089/reservations/api/reservations`
- `apiUrl`: `http://localhost:8088/api/v1/auth` (NB: pas utilisé par `AuthService` actuel)
- `terrainServiceUrl`: `http://localhost:8088/terrain`
- `teamServiceUrl`: `http://localhost:8085/teams/api/teams`
- `rewardServiceUrl`: `http://localhost:8086/rewards/api/rewards`
- `aiServiceUrl`: `http://127.0.0.1:8001` (PythonAI FastAPI)

## 2) Liste des services Angular (où ils se trouvent)

### 2.1 Récompenses (RewardService) — Backend RewardService (Spring Boot)

**Fichier :** `Frontend/src/app/features/rewards/services/reward.service.ts`  
**Base URL :** `environment.rewardServiceUrl` → `http://localhost:8086/rewards/api/rewards`

Endpoints consommés (Front → RewardService) :
- `GET  {base}` → `getRewards()`
- `GET  {base}/{id}` → `getRewardById(id)`
- `POST {base}` → `createReward(body)`
- `PUT  {base}/{id}` → `updateReward(id, body)`
- `DELETE {base}/{id}` → `deleteReward(id)`
- `GET  {base}/user/{userId}` → `getRewardsByUser(userId)`
- `GET  {base}/team/{teamId}` → `getRewardsByTeam(teamId)`
- `POST {base}/{id}/progress` → `progressReward(id, body)`
- `POST {base}/{id}/evolve` → `evolveReward(id)`
- `POST http://localhost:8086/rewards/api/ai/rewards/generate` → `generateRewardsWithAi(body)`
  - Note: le service reconstruit la base en retirant `/api/rewards` pour pointer vers `/api/ai/rewards/...`.
- `GET  {base}/dashboard?teamId&q&type&rarity&status` → `getDashboard(params)`

Écrans qui consomment `RewardService` (principaux) :
- `Frontend/src/app/features/rewards/rewards-list/rewards-list.component.ts`
- `Frontend/src/app/features/rewards/create-reward/create-reward.component.ts`
- `Frontend/src/app/features/rewards/reward-details/reward-details.component.ts`
- `Frontend/src/app/features/rewards/ai-generator/rewards-ai-generator.component.ts` (génération IA)
- `Frontend/src/app/features/rewards/reward-designer/reward-designer.component.ts` (design stocké dans `reward.design`)

### 2.2 IA (RewardsAiService) — PythonAI (FastAPI)

**Fichier :** `Frontend/src/app/features/rewards/services/rewards-ai.service.ts`  
**Base URL :** `environment.aiServiceUrl` → `http://127.0.0.1:8001`

Endpoints consommés (Front → PythonAI) :
- `POST {ai}/rewards/suggest` → `suggest(body)`
- `POST {ai}/rewards/insights` → `insights(body)`
- `GET  {ai}/health` → `health()`

Sécurité importante :
- `RewardsAiService` construit son `HttpClient` via `HttpBackend` pour **bypasser les interceptors** et éviter d’envoyer des tokens `Authorization` vers PythonAI.

### 2.3 Équipes (TeamService) — Backend TeamService

**Fichier :** `Frontend/src/app/features/teams/services/team.service.ts`  
**Base URL :** `environment.teamServiceUrl` → `http://localhost:8085/teams/api/teams`

Endpoints consommés :
- `GET  {base}` (+ query `sport`) → `getTeams(sport?)`
- `GET  {base}/{id}` → `getTeamById(id)`
- `POST {base}` → `createTeam(body)`
- `PUT  {base}/{id}` → `updateTeam(id, body)`
- `DELETE {base}/{id}` → `deleteTeam(id)`
- `POST {base}/{teamId}/join` → `joinTeam(teamId, payload?)`
- `POST {base}/{teamId}/leave` → `leaveTeam(teamId, payload?)`

Utilisation dans Rewards (passage “dropdown équipes”) :
- `Frontend/src/app/features/rewards/create-reward/create-reward.component.ts`
- `Frontend/src/app/features/rewards/reward-details/reward-details.component.ts`
- `Frontend/src/app/features/rewards/rewards-list/rewards-list.component.ts`

Principe :
- Le Front affiche un **dropdown par nom d’équipe**, mais envoie `teamId` au backend (stockage/filtrage).
- `teamName` est auto-rempli côté UI depuis la liste des équipes.

### 2.4 Matchs (MatchService) — Backend MatchService

**Fichier :** `Frontend/src/app/matches/services/match.service.ts`  
**Base URL :** `environment.matchServiceUrl` → `http://localhost:8087/matchs`

Endpoints consommés :
- `GET    {base}/` → `getAll()`
- `GET    {base}/{id}` → `getById(id)`
- `POST   {base}/` → `create(data)`
- `PUT    {base}/{id}` → `update(id, data)`
- `DELETE {base}/{id}` → `delete(id)`
- `PATCH  {base}/{id}/score` → `updateScore(id, scoreEquipe1, scoreEquipe2)`
- `PATCH  {base}/{id}/statut` → `updateStatus(id, statut)`
- `GET    {base}/statut/{statut}` → `filterByStatus(statut)`
- `GET    {base}/type/{type}` → `filterByType(type)`
- `POST   {base}/{matchId}/evenements` → `addEvent(matchId, event)`
- `GET    {base}/{matchId}/evenements` → `getEvents(matchId)`
- `DELETE {base}/{matchId}/evenements/{eventId}` → `deleteEvent(matchId, eventId)`
- `GET    {base}/terrain/{terrainId}` → `filterByTerrain(terrainId)`

### 2.5 Terrains (TerrainService) — Backend TerrainService

**Fichier :** `Frontend/src/app/terrains/services/terrain.service.ts`  
**Base URL :** `environment.terrainServiceUrl` → `http://localhost:8088/terrain`

Endpoints consommés :
- `GET    {base}/` → `getAll()`
- `GET    {base}/{id}` → `getById(id)`
- `POST   {base}/` → `create(data)`
- `PUT    {base}/{id}` → `update(id, data)`
- `DELETE {base}/{id}` → `delete(id)`
- `PATCH  {base}/{id}/statut?statut=...` → `changeStatus(id, statut)`
- `GET    {base}/sport/{typeSport}` → `filterBySport(typeSport)`
- `GET    {base}/statut/{statut}` → `filterByStatus(statut)`
- `GET    {base}/ville/{ville}` → `filterByCity(ville)`
- `PUT    {base}/{id}/creneaux` → `updateSchedule(id, creneaux)`
- `POST   {base}/{id}/photos` (FormData) → `uploadPhoto(id, file)`
- `DELETE {base}/{id}/photos/{filename}` → `deletePhoto(id, filename)`

### 2.6 Réservations (2 services différents)

1) Réservations “terrain” (dans le module terrains)

**Fichier :** `Frontend/src/app/terrains/services/reservation.service.ts`  
**Base URL :** `${environment.terrainServiceUrl}/reservations` → `http://localhost:8088/terrain/reservations`

Endpoints consommés :
- `GET    {base}` → `getAll()`
- `GET    {base}/{id}` → `getById(id)`
- `GET    {base}/terrain/{terrainId}` → `getByTerrain(terrainId)`
- `POST   {base}` → `create(data)`
- `PATCH  {base}/{id}/confirmer` → `confirm(id)`
- `PATCH  {base}/{id}/annuler` → `cancel(id)`
- `DELETE {base}/{id}` → `delete(id)`
- `GET    {base}/disponibilite?terrainId&debut&fin` → `checkAvailability(...)`

2) Réservations (feature reservations)

**Fichier :** `Frontend/src/app/features/reservations/services/reservation.service.ts`  
**URLs :**
- `apiUrl = environment.reservationServiceUrl` → `http://localhost:8089/reservations/api/reservations`
- `terrainUrl = environment.terrainServiceUrl` → `http://localhost:8088/terrain`
- `sportUrl = environment.sportServiceUrl` → `http://localhost:8084/sports`

Endpoints consommés :
- `GET    terrainUrl` → `getTerrains()` (liste terrains)
- `GET    sportUrl` → `getSports()` (liste sports)
- `GET    apiUrl` → `getReservations()` (lit `{ content: [...] }`)
- `GET    apiUrl/{id}` → `getReservationById(id)`
- `POST   apiUrl` → `createReservation(reservation)`
- `PUT    apiUrl/{id}` → `updateReservation(id, reservation)`
- `PUT    apiUrl/{reservation.idReservation}` → `cancelReservation(reservation)` (met `statutR=CANCELLED`)

### 2.7 Sports (SportService) — Backend SportService

**Fichier :** `Frontend/src/app/features/sports/services/sport.service.ts`  
**Base URL :** `${environment.sportServiceUrl}/api/sports` → `http://localhost:8084/sports/api/sports`

Endpoints consommés :
- `GET {base}` → `getAll()`
- `GET {base}/{id}` → `getById(id)`

### 2.8 Utilisateurs (UserManagementService) — Backend UserService

**Fichier :** `Frontend/src/app/core/services/UserService/user-management.service.ts`  
**Base URL :** `${environment.userServiceUrl}/users/users` → `http://localhost:8081/users/users`

Endpoints consommés :
- `GET    {base}` → `getAllUsers()`
- `DELETE {base}/deleteuser/{id}` → `deleteUser(id)`
- `POST   {base}/{userId}/roles/{roleName}` → `assignRole(userId, roleName)`

### 2.9 Authentification (AuthService) — Backend UserService/Auth

**Fichier :** `Frontend/src/app/core/services/AuthService/auth.service.ts`  
**Base URL (hardcodée) :** `http://localhost:8081/users/auth`

Endpoints consommés :
- `POST {base}/login` → `login(request)`
- `POST {base}/create` → `register(payload)`
- `POST {base}/forgot-password` → `forgotPassword(email)`
- `POST {base}/reset-password` → `resetPassword(token, newPassword)`

Stockage local :
- `accessToken`, `refreshToken`, `userEmail`, `userRole`, `firstName`, `lastName`, `userId` (dans `localStorage`)

### 2.10 Social (SocialService) — Backend SocialService

**Fichier :** `Frontend/src/app/features/social/services/social.service.ts`  
**Base URL (hardcodée) :** `http://localhost:8090/social/api`

Endpoints consommés :
- `GET    /posts?expand=true&size=50` → `getPosts()`
- `POST   /posts` → `createPost(post)`
- `PUT    /posts/{id}` → `updatePost(id, post)`
- `DELETE /posts/{id}` → `deletePost(id)`
- `POST   /commentaires` → `createComment(comment)`
- `DELETE /commentaires/{id}` → `deleteComment(id)`
- `POST   /reactions` → `createReaction(reaction)`
- `DELETE /reactions/{id}` → `deleteReaction(id)`

Remarque :
- Ici le service n’utilise pas `environment.socialServiceUrl` (il a sa base en dur).

## 3) Passage Backend → Frontend (exemple détaillé : Récompenses)

### 3.1 Backend RewardService (Spring)

Localisation : `Backend/RewardService`

- Config : `Backend/RewardService/src/main/resources/application.properties`
  - `server.port=8086`
  - `server.servlet.context-path=/rewards`
- Endpoints exposés (controllers) :
  - `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/controller/RewardController.java`
  - `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/controller/RewardEvolutionController.java`
  - `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/controller/RewardDashboardController.java`
  - `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/controller/RewardAIController.java`
- DB : MongoDB, collection `rewards` (`Reward` est un `@Document`) :
  - `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/entity/Reward.java`
- Mapping :
  - Entity → DTO : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/mapper/RewardMapper.java`
  - DTO sortant principal : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/dto/RewardDto.java`

### 3.2 Frontend Rewards (Angular)

Chaîne de bout en bout (CRUD simple) :
1) UI (ex: `create-reward.component.ts`) construit un `body` (form)
2) UI appelle `RewardService.createReward(body)`
3) `RewardService` fait `POST http://localhost:8086/rewards/api/rewards`
4) Backend reçoit `RewardCreateRequest`, construit `Reward`, sauvegarde Mongo, map vers `RewardDto`
5) Backend renvoie JSON `RewardDto`
6) UI reçoit `Reward` (interface TS) et navigue vers `/rewards/{id}`

Pour le filtrage par équipe :
- UI affiche le **nom d’équipe** (dropdown via `TeamService.getTeams()`), mais utilise `teamId` en interne.
- UI appelle `RewardService.getRewardsByTeam(teamId)` (endpoint backend `/api/rewards/team/{teamId}`).

IA :
- **Génération de récompenses** (Front → Spring) : `RewardService.generateRewardsWithAi(...)` appelle `POST /api/ai/rewards/generate`
- **Assistant IA UI** (Front → PythonAI direct) : `RewardsAiService.suggest/insights/health`

## 4) À retenir pour une validation/démo

- Les URLs viennent de `environment.ts` (sauf `AuthService` et `SocialService` qui ont une base hardcodée).
- Chaque “Service Angular” encapsule des appels HTTP et retourne des `Observable<T>`.
- Les composants (UI) appellent les services et mettent à jour l’état (`loading`, `error`, etc.).
- Les DTO côté backend deviennent des interfaces TS côté frontend (ex: `RewardDto` → `Reward`).

