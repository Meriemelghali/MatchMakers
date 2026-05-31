# Documentation détaillée — Module Récompenses (Rewards) (Backend + Frontend)

Objectif : te donner une lecture **très détaillée** du module Rewards, côté serveur (Spring Boot) et côté client (Angular).

> Note : pour rester lisible, je documente **chaque “ligne utile / instruction”** (métier, contrôle, appel HTTP, mapping, etc.).  
> Les blocs répétitifs (imports, annotations évidentes, getters/setters Lombok) sont expliqués **en groupe** plutôt que littéralement “1 commentaire par ligne import”.

---

## A) BACKEND — RewardService (Spring Boot)

### A1) `RewardController` (API CRUD + filtres)
Fichier : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/controller/RewardController.java`

**But :** exposer des endpoints REST sous `/api/rewards` et déléguer la logique métier à `RewardService`.

- Annotations de classe :
  - `@RestController` : la classe expose des routes HTTP et retourne du JSON.
  - `@RequestMapping("/api/rewards")` : préfixe de toutes les routes.
  - `@RequiredArgsConstructor` : Lombok génère un constructeur avec les dépendances `final`.
  - `@CrossOrigin(origins = "*")` : autorise les appels du front (CORS) depuis n’importe quelle origine.
- Champ :
  - `private final RewardService service;` : injection du service métier.

**Endpoints :**
- `@PostMapping` → `create(...)`
  - `@Valid @RequestBody RewardCreateRequest request` : Spring valide le body selon les annotations `@NotNull/@NotBlank/...`.
  - `ResponseEntity.status(HttpStatus.CREATED)` : retourne HTTP 201.
  - `service.create(request)` : crée et persiste une récompense puis renvoie `RewardDto`.
- `@GetMapping` → `getAll()`
  - `service.getAll()` : liste toutes les récompenses.
- `@GetMapping("/{id}")` → `getOne(id)`
  - `@PathVariable String id` : l’id vient de l’URL.
  - `service.get(id)` : charge une récompense (ou 404 si introuvable).
- `@PutMapping("/{id}")` → `update(id, request)`
  - update “partiel” : chaque champ est optionnel dans `RewardUpdateRequest`.
- `@DeleteMapping("/{id}")` → `delete(id)`
  - supprime côté DB, puis `204 No Content`.
- `@GetMapping("/user/{userId}")` → `byUser(userId)`
  - filtre DB par `userId`.
- `@GetMapping("/team/{teamId}")` → `byTeam(teamId)`
  - filtre DB par `teamId`.

---

### A2) `RewardServiceImpl` (logique CRUD)
Fichier : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/service/impl/RewardServiceImpl.java`

**But :** implémenter l’interface `RewardService` avec MongoDB (`RewardRepository`) et MapStruct (`RewardMapper`).

- Annotations :
  - `@Service` : bean Spring.
  - `@Transactional` : toutes les méthodes sont transactionnelles (utile même si Mongo gère différemment : cohérence côté Spring).
- Dépendances :
  - `repository` : accès DB (Mongo).
  - `mapper` : conversion `Reward ↔ RewardDto` et `RewardCreateRequest → Reward`.

**Méthode `create(request)` :**
- `Reward reward = mapper.fromCreate(request);`
  - mapstruct copie les champs *autorisés* depuis la requête.
  - dans le mapper, beaucoup de champs sont `ignore = true` (id, status, progress, etc.) pour éviter qu’un client force ces valeurs.
- `reward.setStatus(RewardStatus.ACTIVE);`
  - statut par défaut à la création.
- Défauts “sécurité/consistance” :
  - `level` → 1 si null
  - `progress` → 0 si null
  - `maxProgress` → 100 si null
  - `evolutive` → false si null
- `createdAt` + `updatedAt` à `LocalDateTime.now()`
  - timestamps au moment de la création.
- `Reward saved = repository.save(reward);`
  - insertion Mongo.
- `return mapper.toDto(saved);`
  - conversion entity → DTO.

**Méthode `update(id, request)` :**
- `repository.findById(id).orElseThrow(...)`
  - si introuvable : `NotFoundException` (→ gérée en 404 par `GlobalExceptionHandler`).
- Série de `if (request.getX() != null) reward.setX(...)`
  - update partiel : seulement les champs fournis sont modifiés.
- Partie “evolution/design” :
  - `evolutive`, `maxProgress`, `evolutionRules`, `design` peuvent être mis à jour.
- `reward.setUpdatedAt(LocalDateTime.now());`
- `repository.save(reward)` puis mapping en `RewardDto`.

**Méthode `delete(id)` :**
- `existsById` pour décider si 404.
- `deleteById`.

**Méthode `get(id)` :**
- `findById` sinon 404.
- `mapper.toDto`.

**Méthodes `getAll/getByUser/getByTeam` :**
- Appellent `repository.findAll/findByUserId/findByTeamId`
- Puis mapping en liste de DTO.

---

### A3) `RewardRepository` (Mongo queries)
Fichier : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/repository/RewardRepository.java`

**But :** déclarer les requêtes Mongo (Spring Data) :
- `MongoRepository<Reward, String>` : CRUD standard.
- `findByUserId(String userId)` : Spring génère la query `{ userId: ... }`.
- `findByTeamId(String teamId)` : Spring génère la query `{ teamId: ... }`.

---

### A4) `RewardMapper` (MapStruct)
Fichier : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/mapper/RewardMapper.java`

**But :** mapping safe et automatisé.

- `@Mapper(componentModel = "spring")` : MapStruct génère une implémentation injectée par Spring.
- `RewardDto toDto(Reward reward)` : entity → DTO.
- `List<RewardDto> toDtoList(List<Reward> rewards)` : list mapping.
- `Reward fromCreate(RewardCreateRequest request)` :
  - `@Mapping(target = "id", ignore = true)` : le client ne choisit pas l’id.
  - `status/revokedReason/level/progress/maxProgress/evolutive/evolutionRules/design/createdAt/updatedAt` ignorés :
    - ça force le backend à contrôler ces champs (défauts, règles métier).

---

### A5) `Reward` (document Mongo)
Fichier : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/entity/Reward.java`

**But :** modèle persisté en MongoDB.

- `@Document(collection = "rewards")` : collection Mongo.
- Champs “métier” : `name/type/description/dateAwarded/points/rarity/status/...`
- Champs “liaison” : `userId/username/teamId/teamName/eventId`
- Champs “évolution” : `level/progress/maxProgress/evolutive/evolutionRules`
- Champ “design” : `design` (Map) → configuration UI (designer).
- `createdAt/updatedAt`

Pourquoi `Map<String,Object>` pour `design` et `evolutionRules` ?
- flexibilité : on peut faire évoluer le schéma côté front sans casser la DB.
- attention : moins de validation compile-time → idéalement on documente la forme attendue côté front.

---

### A6) Évolution — `RewardEvolutionServiceImpl`
Fichier : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/service/impl/RewardEvolutionServiceImpl.java`

**But :** gérer la progression (`progress`) et l’évolution de niveau (`level`) d’une récompense “évolutive”.

#### `addProgress(rewardId, request)`
1) Charge la reward :
   - `repository.findById(...)` sinon `NotFoundException` → 404.
2) Snapshot “before” :
   - `Reward before = snapshot(reward);`
   - sert à retourner un `before/after` clair au front.
3) Normalise le delta :
   - `delta = request.getDelta() != null ? request.getDelta() : 0;`
   - si delta < 0 → 0 (anti-triche / pas de régression).
4) Normalise et met à jour les compteurs :
   - `setMaxProgress(normalizeMax(...))`
   - `setProgress(normalizeProgress(...) + delta)`
5) `updatedAt = now`
6) Mode auto :
   - `auto = request.getAutoEvolve() == null || request.getAutoEvolve()`
   - si `auto=true` : appelle `evolveIfNeeded(...)`
   - sinon : sauvegarde uniquement la progression et renvoie `leveledUp=false`.

#### `evolveNow(rewardId)`
1) Charge reward, snapshot “before”
2) Normalise `maxProgress` et `progress`
3) appelle `evolveIfNeeded(...)`

#### `evolveIfNeeded(reward, beforeSnapshot)`
1) Vérifie `evolutive` :
   - si `false` : save + message “n’est pas evolutive”.
2) Vérifie si `progress < max` :
   - si oui : save + message “insuffisant pour evoluer”.
3) Sinon : boucle de level-up :
   - tant que `progress >= max` :
     - `levelsGained++`
     - `level++`
     - `progress = 0` (spec “reset progress on level up”)
     - `max = nextMaxProgress(...)` (augmente le max)
4) Met à jour :
   - `level/progress/maxProgress`
   - `bumpPower(...)` : augmente les points selon `pointsPerLevel` (règle ou défaut 10)
   - `pickRarity(...)` : rarity selon niveau (COMMON/RARE/EPIC/LEGENDARY)
5) Renommage IA (optionnel) :
   - `shouldRenameWithAi(...)` lit `evolutionRules.renameWithAi` (défaut true)
   - appelle `RewardEvolutionNamingService.suggestEvolvedNaming(...)`
6) Save + retourne `RewardEvolutionPreviewDto(before, after, leveledUp=true, levelsGained, ...)`.

---

### A7) Dashboard — `RewardDashboardServiceImpl`
Fichier : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/service/impl/RewardDashboardServiceImpl.java`

**But :** construire des stats pour le front (total, répartition par type/équipe, avg/max points).

#### `getDashboard(teamId, q, type, rarity, status)`
1) Base dataset :
   - si `teamId` existe → `findByTeamId(teamId)`
   - sinon → `findAll()`
2) `filtered = applyFilters(base, q, type, rarity, status)`
3) Remplit `RewardDashboardDto` :
   - `total = filtered.size()`
   - `generatedAt = now`
4) `byType` :
   - groupBy `type.name()` (ou "AUTRE")
   - convertit en `RewardDashboardItemDto(label,count)`
5) `byTeam` :
   - utilise `teamName` si présent sinon fallback `teamId` sinon “Sans equipe”
6) `avgPoints/maxPoints` :
   - ignore points null ou négatifs.

#### `applyFilters(base, q, type, rarity, status)`
1) `query` = q lower-case
2) parse enums :
   - `typeEnum`, `rarityEnum`, `statusEnum` via `parseEnum`
3) boucle sur rewards :
   - si `q` présent : match sur `name` OU `username` OU `teamName`
   - filtre `type/rarity/status` si fourni

---

### A8) IA (génération) — `RewardAIServiceImpl`
Fichier : `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/service/impl/RewardAIServiceImpl.java`

**But :** générer des suggestions de récompenses.

#### `generateRewards(request)`
1) `callPythonAi(request)`
2) si PythonAI renvoie des items : retourne la liste
3) sinon : `fallback(request)` (liste déterministe)

#### `callPythonAi(request)`
1) Construit `RestClient` avec `pythonAiBaseUrl` (configurable)
2) Construit body JSON :
   - `eventType`, `teamCount`, `difficulty`
3) POST `/rewards/generate` vers PythonAI
4) Convertit réponse → DTOs :
   - `safe(...)` limite longueur
   - `parseType(...)`/`parseRarity(...)` rendent robuste aux erreurs de l’IA
5) En cas d’exception : retourne `null`

#### `fallback(request)`
1) Utilise `eventType`, `teamCount`, `difficulty`
2) Calcule un multiplicateur de points selon difficulté
3) Retourne une liste de suggestions “pré-packagées”

---

### A9) Gestion d’erreurs
Fichiers :
- `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/exception/NotFoundException.java`
- `Backend/RewardService/src/main/java/tn/matchmakers/rewardservice/exception/GlobalExceptionHandler.java`

**But :**
- Si une récompense n’existe pas : `NotFoundException`
- `GlobalExceptionHandler` transforme en réponse JSON 404 stable.

---

## B) FRONTEND — Module Rewards (Angular)

### B1) Configuration URL Rewards
Fichier : `Frontend/src/environments/environment.ts`

- `rewardServiceUrl`: `http://localhost:8086/rewards/api/rewards`
- `aiServiceUrl`: `http://127.0.0.1:8001`
- `teamServiceUrl`: `http://localhost:8085/teams/api/teams`

---

### B2) Service HTTP principal — `RewardService`
Fichier : `Frontend/src/app/features/rewards/services/reward.service.ts`

**But :** centraliser tous les appels HTTP vers le backend RewardService.

- `private base = environment.rewardServiceUrl;`
  - base = `http://localhost:8086/rewards/api/rewards`
- Méthodes → endpoints :
  - `getRewards()` → `GET base`
  - `getRewardById(id)` → `GET base/{id}`
  - `createReward(body)` → `POST base`
  - `updateReward(id, body)` → `PUT base/{id}`
  - `deleteReward(id)` → `DELETE base/{id}`
  - `getRewardsByUser(userId)` → `GET base/user/{userId}`
  - `getRewardsByTeam(teamId)` → `GET base/team/{teamId}`
  - `progressReward(id, body)` → `POST base/{id}/progress`
  - `evolveReward(id)` → `POST base/{id}/evolve`
  - `generateRewardsWithAi(body)` :
    - calcule `baseUrl` en retirant `/api/rewards`
    - appelle `POST {baseUrl}/api/ai/rewards/generate`
  - `getDashboard(params)` :
    - construit `HttpParams` proprement (trim + ignore vides)
    - appelle `GET base/dashboard?....`

---

### B3) IA UI (direct) — `RewardsAiService`
Fichier : `Frontend/src/app/features/rewards/services/rewards-ai.service.ts`

**But :** appeler PythonAI sans passer par le backend.

Points clés :
- `private base = (environment.aiServiceUrl ?? '').replace(/\/$/, '')`
  - normalise l’URL sans slash final.
- `constructor(httpBackend: HttpBackend)` :
  - `new HttpClient(httpBackend)` :
    - bypass des interceptors (pour ne pas envoyer d’Authorization au service IA).
- Endpoints :
  - `POST {base}/rewards/suggest`
  - `POST {base}/rewards/insights`
  - `GET  {base}/health`

---

### B4) Page “liste + filtre bar” — `RewardsListComponent`
Fichiers :
- `Frontend/src/app/features/rewards/rewards-list/rewards-list.component.ts`
- `Frontend/src/app/features/rewards/rewards-list/rewards-list.component.html`

**But :**
- charger toutes les récompenses
- filtrer via la barre (équipe + query + type + rarity + status + tri)
- afficher dashboard + charts
- proposer une modale IA “insights”

#### 1) Chargement initial (`ngOnInit`)
- `loadTeams()` :
  - appelle `TeamService.getTeams()`
  - remplit `this.teams` pour le dropdown (affichage des noms)
- `load()` :
  - appelle `RewardService.getRewards()`
  - met `this.rewards` (dataset complet)
  - met `this.base = data` (base courante)
  - appelle `applyLocalFilters()`

#### 2) Filtre équipe (server-side) (`applyFilters()`)
But : **éviter de filtrer par team côté front** quand l’équipe est sélectionnée, et demander au backend uniquement cette équipe.

- Si `this.teamId` est non vide :
  - `getRewardsByTeam(this.teamId)` → backend `/api/rewards/team/{teamId}`
  - `this.base = data`
  - `applyLocalFilters()`
- Sinon :
  - `this.base = this.rewards` (retour dataset complet)
  - `applyLocalFilters()`

#### 3) Filtres locaux (`applyLocalFilters()`)
But : filtrer ce qui est dans `this.base` selon les champs UI.

- `q` :
  - match sur `name` ou `username` ou `teamName`
- `typeFilter` :
  - match strict sur le type
- `rarityFilter/statusFilter` :
  - match strict
- Tri :
  - par date (asc/desc) ou points desc
- Pagination :
  - remplit `this.visible` pour afficher la page.
- Dashboard :
  - appelle `refreshDashboard()` → (async) appelle `loadDashboardFromApi()`

#### 4) Dashboard API (`loadDashboardFromApi()`)
- construit `params` (teamId, q, type, rarity, status)
- appelle `RewardService.getDashboard(params)` → backend `/api/rewards/dashboard`
- met à jour `this.dashboard` puis reconstruit les charts.

#### 5) HTML : comment la barre déclenche les méthodes
Dans `rewards-list.component.html` :
- dropdown équipe :
  - `[(ngModel)]="teamId"` + `(ngModelChange)="applyFilters()"`
- autres champs :
  - `(ngModelChange)="page = 1; applyLocalFilters()"`
- reset :
  - `(click)="resetFilters()"`

---

### B5) Création reward — `CreateRewardComponent`
Fichiers :
- `Frontend/src/app/features/rewards/create-reward/create-reward.component.ts`
- `Frontend/src/app/features/rewards/create-reward/create-reward.component.html`

**But :**
- afficher un formulaire
- auto-remplir `username` via localStorage
- choisir une équipe via dropdown (nom visible, id envoyé)
- créer la reward via `RewardService.createReward`
- optionnel : assistant IA “suggest” (PythonAI direct)

Points clés côté TS :
- `loadTeams()` :
  - récupère la liste des équipes
- `teamId.valueChanges` :
  - quand tu changes d’équipe, le code met automatiquement `teamName` (readonly) à partir de la liste.
- `normalizePayload()` :
  - convertit `points` en number
  - nettoie `imageUrl/awardedBy/description/...`
  - met `teamId` et `teamName` cohérents (depuis la liste)
- `submit()` :
  - vérifie form valid
  - récupère `userId` depuis `AuthService`
  - appelle `rewardService.createReward(body)`

---

### B6) Update reward — `RewardDetailsComponent`
Fichiers :
- `Frontend/src/app/features/rewards/reward-details/reward-details.component.ts`
- `Frontend/src/app/features/rewards/reward-details/reward-details.component.html`

**But :**
- charger une reward par id
- permettre update (PUT)
- permettre delete (DELETE)
- sélectionner l’équipe via dropdown (idem create)

Points clés :
- `ngOnInit()` récupère `id` depuis la route puis `fetch(id)`
- `fetch(id)` :
  - `getRewardById` → patch le formulaire
- `loadTeams()` + `teamId.valueChanges` :
  - synchronise `teamName` depuis la liste
- `normalizePayload()` :
  - gère `status` + `revokedReason`
  - normalise `teamId/teamName`
- `save()` :
  - appelle `updateReward(id, body)`
- `delete()` :
  - confirmation + `deleteReward(id)`

---

### B7) Générateur IA (via backend) — `RewardsAiGeneratorComponent`
Fichier : `Frontend/src/app/features/rewards/ai-generator/rewards-ai-generator.component.ts`

**But :**
- demander au backend `/api/ai/rewards/generate` une liste de suggestions
- accepter/refuser une suggestion
- si acceptée : créer une reward via `createReward`

Flow :
- `generate()` :
  - construit `{eventType, teamCount, difficulty}`
  - appelle `rewardService.generateRewardsWithAi(body)`
- `accept(s)` :
  - construit le body create reward depuis la suggestion
  - appelle `rewardService.createReward(body)`

---

### B8) Designer — `RewardDesignerComponent`
Fichier : `Frontend/src/app/features/rewards/reward-designer/reward-designer.component.ts`

**But :**
- générer une image (canvas) + config `design`
- sauvegarder dans la reward : `reward.imageUrl` + `reward.design`

Flow :
- `fetch(id)` charge la reward
- `applyDesign(d)` rehydrate le design sauvegardé
- `exportPng()` génère une dataURL PNG depuis le canvas
- `saveToReward()` appelle `updateReward(reward.id, { imageUrl, design })`

---

### B9) Routing du module Rewards
Fichier : `Frontend/src/app/features/rewards/rewards-routing.module.ts`

Routes :
- `/rewards` → liste
- `/rewards/ai-generator` → générateur IA
- `/rewards/create` → création
- `/rewards/:id` → détails/update
- `/rewards/:id/designer` → designer

