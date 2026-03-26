# PythonAI (Gratuit, Sans API Key)

Ce dossier contient un petit service Python (FastAPI) qui donne une "IA" pour l'ecran **Classement** en utilisant **Ollama** (LLM local).

## Prerequis

- Python 3.10+
- Ollama installe (gratuit)

## Lancer Ollama

1. Lancer le serveur:
   - `ollama serve`
2. Telecharger un modele (exemple):
   - `ollama pull gemma2:2b`

## Lancer le service Python

```powershell
cd PythonAI
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001
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

- `OLLAMA_URL` (default: `http://localhost:11434`)
- `OLLAMA_MODEL` (default: `gemma2:2b`)



