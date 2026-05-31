# Documentation — Module Rewards (Frontend + Backend + IA)

Cette doc couvre **uniquement le module Rewards** : où se trouve le code, quelles APIs sont appelées, et le passage **Backend → Frontend** (et IA).

## 1) URLs et ports (local)

### 1.1 Backend RewardService (Spring Boot)

- **Port** : `8086`
- **Context-path** : `/rewards`
- **Base HTTP** : `http://localhost:8086/rewards`
- **MongoDB** : `mongodb://localhost:27017/rewardsdb`

Config : `Backend/RewardService/src/main/resources/application.properties`

### 1.2 Frontend (Angular) — URL du RewardService

- `environment.rewardServiceUrl = 'http://localhost:8086/rewards/api/rewards'`

Config : `Frontend/src/environments/environment.ts:12`

### 1.3 IA locale (PythonAI FastAPI)

- `environment.aiServiceUrl = 'http://127.0.0.1:8001'`

Config : `Frontend/src/environments/environment.ts:14`

## 2) Backend RewardService — architecture et endpoints

### 2.1 Structure

Racine : `Backend/RewardService`

- Controllers : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/controller`
- Services : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/service`
- Repositories : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/repository`
- Entity : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/entity/Reward.java`
- DTOs : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/dto`
- Mapper MapStruct : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/mapper/RewardMapper.java`

### 2.2 Endpoints exposés (côté backend)

Base : `http://localhost:8086/rewards`

CRUD + filtres :
- `POST   /api/rewards`
- `GET    /api/rewards`
- `GET    /api/rewards/{id}`
- `PUT    /api/rewards/{id}`
- `DELETE /api/rewards/{id}`
- `GET    /api/rewards/user/{userId}`
- `GET    /api/rewards/team/{teamId}`

Code : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/controller/RewardController.java`

Évolution :
- `POST /api/rewards/{id}/progress` (body: `RewardProgressRequest`)
- `POST /api/rewards/{id}/evolve`

Code : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/controller/RewardEvolutionController.java`

Dashboard :
- `GET /api/rewards/dashboard?teamId=&q=&type=&rarity=&status=`

Code : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/controller/RewardDashboardController.java`

IA (génération) :
- `POST /api/ai/rewards/generate` (body: `RewardAIGenerateRequest`)

Code : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/controller/RewardAIController.java`

## 3) Frontend Rewards — où est le code

### 3.1 Services HTTP (Angular)

1) `RewardService` (appelle le backend RewardService)
- Fichier : `Frontend/src/app/features/rewards/services/reward.service.ts`
- Base : `environment.rewardServiceUrl` (`http://localhost:8086/rewards/api/rewards`)
- Méthodes :
  - `getRewards()`
  - `getRewardById(id)`
  - `createReward(body)`
  - `updateReward(id, body)`
  - `deleteReward(id)`
  - `getRewardsByUser(userId)`
  - `getRewardsByTeam(teamId)`
  - `progressReward(id, body)`
  - `evolveReward(id)`
  - `generateRewardsWithAi(body)` → appelle `POST /api/ai/rewards/generate`
  - `getDashboard(params)` → appelle `GET /dashboard` (query params)

2) `RewardsAiService` (appelle PythonAI direct)
- Fichier : `Frontend/src/app/features/rewards/services/rewards-ai.service.ts`
- Base : `environment.aiServiceUrl` (`http://127.0.0.1:8001`)
- Méthodes :
  - `suggest(...)` → `POST /rewards/suggest`
  - `insights(...)` → `POST /rewards/insights`
  - `health()` → `GET /health`
- Note sécurité : utilise `HttpBackend` pour bypasser les interceptors et éviter de leak des tokens.

3) `TeamService` (pour dropdown des équipes)
- Fichier : `Frontend/src/app/features/teams/services/team.service.ts`
- Base : `environment.teamServiceUrl` (`http://localhost:8085/teams/api/teams`)
- Utilisé dans Rewards pour :
  - afficher le **nom** des équipes (dropdown),
  - tout en envoyant `teamId` au backend.

### 3.2 Pages / composants du module Rewards

Racine : `Frontend/src/app/features/rewards/`

- Liste + filtres + dashboard + IA insights :
  - `Frontend/src/app/features/rewards/rewards-list/rewards-list.component.ts`
  - `Frontend/src/app/features/rewards/rewards-list/rewards-list.component.html`
- Création reward (+ assistant IA “suggest”) :
  - `Frontend/src/app/features/rewards/create-reward/create-reward.component.ts`
  - `Frontend/src/app/features/rewards/create-reward/create-reward.component.html`
- Détails + update + progression/évolution (selon UI) :
  - `Frontend/src/app/features/rewards/reward-details/reward-details.component.ts`
  - `Frontend/src/app/features/rewards/reward-details/reward-details.component.html`
- IA Generator (génération de rewards) :
  - `Frontend/src/app/features/rewards/ai-generator/rewards-ai-generator.component.ts`
  - `Frontend/src/app/features/rewards/ai-generator/rewards-ai-generator.component.html`
- Designer (stocke `design` dans Reward) :
  - `Frontend/src/app/features/rewards/reward-designer/reward-designer.component.ts`
  - `Frontend/src/app/features/rewards/reward-designer/reward-designer.component.html`

Module + routing :
- `Frontend/src/app/features/rewards/rewards.module.ts`
- `Frontend/src/app/features/rewards/rewards-routing.module.ts`

## 4) Passage Backend → Frontend (flows typiques)

### 4.1 Créer une récompense (CRUD)

1) UI : `create-reward.component.ts` construit le `body` depuis le formulaire
2) UI appelle : `RewardService.createReward(body)`
3) HTTP : `POST http://localhost:8086/rewards/api/rewards`
4) Backend : `RewardController.create(...)` → `RewardServiceImpl.create(...)`
5) Backend :
   - MapStruct `RewardMapper.fromCreate(...)` → `Reward` entity
   - valeurs par défaut + `createdAt/updatedAt`
   - `RewardRepository.save(...)` (Mongo)
6) Backend renvoie `RewardDto` (JSON)
7) UI reçoit `Reward` (interface TS dans `reward.service.ts`) et redirige vers `/rewards/{id}`

### 4.2 Filtrer par équipe (sans afficher d’ID)

1) UI charge les équipes :
   - `TeamService.getTeams()` → `GET http://localhost:8085/teams/api/teams`
2) UI affiche un dropdown par `team.name`
3) Quand tu sélectionnes une équipe, le code garde `teamId` en interne et appelle :
   - `RewardService.getRewardsByTeam(teamId)` → `GET http://localhost:8086/rewards/api/rewards/team/{teamId}`

### 4.3 Évolution : progression + evolve

1) UI envoie un delta :
   - `progressReward(id, { delta, reason?, autoEvolve? })`
2) Backend :
   - `RewardEvolutionServiceImpl.addProgress(...)`
   - met à jour `progress`, puis si `autoEvolve=true` déclenche `evolveIfNeeded(...)`
3) Réponse : `RewardEvolutionPreview` (before/after + message)

### 4.4 IA : génération et assistant

Deux voies :

1) **Génération IA via Backend RewardService**
- UI : `RewardService.generateRewardsWithAi(body)`
- HTTP : `POST http://localhost:8086/rewards/api/ai/rewards/generate`
- Backend : `RewardAIServiceImpl` appelle PythonAI `POST http://127.0.0.1:8001/rewards/generate`
- Si PythonAI down : fallback côté Spring (liste de suggestions)

2) **Assistant IA UI (direct PythonAI)**
- UI : `RewardsAiService.suggest/insights/health`
- HTTP : `http://127.0.0.1:8001/...`

## 5) Modèles / DTO importants

Backend :
- Entity : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/entity/Reward.java`
- DTO sortie : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/dto/RewardDto.java`
- DTO create : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/dto/RewardCreateRequest.java`
- DTO update : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/dto/RewardUpdateRequest.java`

Frontend :
- Interfaces TS : `Frontend/src/app/features/rewards/services/reward.service.ts` (types `Reward`, `CreateRewardRequest`, etc.)

