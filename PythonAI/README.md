# PythonAI (Leaderboard AI)

Ce dossier contient un petit service Python (FastAPI) qui donne une IA pour l'ecran **Classement**.

- Mode 1 (recommande): **OpenRouter** (cloud) via `OPENROUTER_API_KEY`
- Mode 2 (fallback gratuit): **Ollama** (LLM local)

## Prerequis

- Python 3.10+
- Optionnel: Ollama installe (gratuit)

## Lancer le service Python

```powershell
cd PythonAI
.\run.ps1
```

Ou manuellement:

```powershell
cd PythonAI
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 8001
```

## Endpoint

- `GET /health`
- `POST /leaderboard`

Exemple:

```powershell
$body = @{ question = 'Resume le classement'; context = 'Top equipes: #1 A 10 pts' } | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8001/leaderboard -Method Post -ContentType 'application/json' -Body $body
```

## Variables d'environnement (optionnel)

Template: `PythonAI/.env.example` (copie vers `PythonAI/.env`, ce fichier est ignore par git).

- OpenRouter:
  - `OPENROUTER_API_KEY` (active OpenRouter)
  - `OPENROUTER_MODEL` (default: `nvidia/nemotron-3-super-120b-a12b:free`)
  - `OPENROUTER_BASE_URL` (default: `https://openrouter.ai/api/v1`)
  - `OPENROUTER_SITE_URL` (optionnel)
  - `OPENROUTER_APP_NAME` (optionnel)
- Ollama:
  - `OLLAMA_URL` (default: `http://127.0.0.1:11434`)
  - `OLLAMA_MODEL` (default: `gemma2:2b`)
