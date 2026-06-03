FROM python:3.10-slim

WORKDIR /app

# ─── Système ───────────────────────────────────────────────────────────────
# build-essential requis par certains packages (detoxify, cryptography...)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ─── Layer 1 : Dépendances LOURDES (cachées) ───────────────────────────────
# Ce layer ne se rebuilde QUE si requirements-heavy.txt change.
# Contient torch (~200MB CPU), detoxify, pandas, numpy, xgboost.
# Premier build : lent. Builds suivants : instantané (cache Docker).
COPY requirements-heavy.txt .
RUN pip install --no-cache-dir --timeout 300 -r requirements-heavy.txt

# ─── Layer 2 : Dépendances LÉGÈRES ─────────────────────────────────────────
# Ce layer se rebuilde rapidement si requirements-light.txt change.
# fastapi, uvicorn, httpx, google-generativeai, openai, etc.
COPY requirements-light.txt .
RUN pip install --no-cache-dir --timeout 120 -r requirements-light.txt

# ─── Code source ───────────────────────────────────────────────────────────
# Copié en DERNIER : un changement de code ne retélécharge aucun package.
COPY . .

EXPOSE 8001

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
