import os
"""
MatchMakers - PythonAI (FastAPI)

Ce service expose des endpoints IA utilises par le module Rewards (Angular) et par le backend RewardService (Spring):
- `GET /health` : diagnostic provider/model
- `POST /rewards/suggest` : suggestion de recompense (nom/description/points/rarity)
- `POST /rewards/insights` : analyse/QA sur un contexte de recompenses
- `POST /rewards/generate` : generation d'une liste de recompenses
- `POST /leaderboard` : texte pour l'ecran classement

Providers:
- OpenRouter (cloud) si `OPENROUTER_API_KEY` est configure
- Ollama (local) sinon (via `OLLAMA_URL` + `OLLAMA_MODEL`)

Les sorties LLM pouvant etre non fiables, ce fichier contient des etapes de "sanitization":
clamp des longueurs, normalisation des enums, extraction JSON, et fallbacks deterministes.
"""

import time
import asyncio
import json
import re
from typing import Optional

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-super-120b-a12b:free")
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "").strip()
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "MatchMakers").strip()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
# Default to a small model that is commonly available; override via env.
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma2:2b")


class LeaderboardRequest(BaseModel):
    question: str = Field(min_length=1)
    context: Optional[str] = None
    model: Optional[str] = None


class LeaderboardResponse(BaseModel):
    answer: str
    from_llm: bool
    model: Optional[str] = None
    latency_ms: int


class RewardsSuggestRequest(BaseModel):
    goal: Optional[str] = None
    type: Optional[str] = None
    teamName: Optional[str] = None
    dateAwarded: Optional[str] = None
    currentName: Optional[str] = None
    currentDescription: Optional[str] = None
    currentPoints: Optional[int] = None
    currentRarity: Optional[str] = None
    model: Optional[str] = None


class RewardsSuggestResponse(BaseModel):
    name: str
    description: str
    points: int
    rarity: Optional[str] = None
    awardedBy: Optional[str] = None
    rationale: Optional[str] = None
    from_llm: bool
    model: Optional[str] = None
    latency_ms: int


class RewardsInsightsRequest(BaseModel):
    question: str = Field(min_length=1)
    context: Optional[str] = None
    model: Optional[str] = None


class RewardsInsightsResponse(BaseModel):
    answer: str
    from_llm: bool
    model: Optional[str] = None
    latency_ms: int


class RewardsGenerateRequest(BaseModel):
    eventType: str = Field(min_length=1)
    teamCount: int = Field(default=2, ge=1, le=128)
    difficulty: str = Field(min_length=1)
    model: Optional[str] = None


class RewardsGenerateItem(BaseModel):
    name: str
    description: str
    type: str
    rarity: str
    points: int


class RewardsGenerateResponse(BaseModel):
    items: list[RewardsGenerateItem]
    from_llm: bool
    model: Optional[str] = None
    latency_ms: int


app = FastAPI(title="MatchMakers Python AI", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """
    Healthcheck simple.

    Utilise par le frontend pour afficher:
    - provider actif (openrouter ou ollama)
    - modele utilise
    - info de config (URL, presence de cle, etc.)
    """
    provider = "openrouter" if OPENROUTER_API_KEY else "ollama"
    return {
        "ok": True,
        "provider": provider,
        "openrouter_base_url": OPENROUTER_BASE_URL,
        "openrouter_model": OPENROUTER_MODEL,
        "openrouter_key_configured": bool(OPENROUTER_API_KEY),
        "ollama_url": OLLAMA_URL,
        "ollama_model": OLLAMA_MODEL,
    }


def _build_prompt(req: LeaderboardRequest) -> str:
    parts = []
    parts.append("Tu es un assistant pour l'ecran 'Classement' de MatchMakers.")
    parts.append("Reponds en francais et produis un mini-document Markdown clair.")
    parts.append("Format attendu: ## Resume, ## Points cles, ## Actions (3).")
    parts.append("Si une info manque, dis-le clairement et propose une alternative.")
    if req.context and req.context.strip():
        parts.append("")
        parts.append("CONTEXTE (document):")
        parts.append(req.context.strip())
    parts.append("")
    parts.append("QUESTION:")
    parts.append(req.question.strip())
    return "\n".join(parts)


def _openrouter_headers() -> Optional[dict]:
    if not (OPENROUTER_SITE_URL or OPENROUTER_APP_NAME):
        return None
    h = {}
    if OPENROUTER_SITE_URL:
        h["HTTP-Referer"] = OPENROUTER_SITE_URL
    if OPENROUTER_APP_NAME:
        h["X-OpenRouter-Title"] = OPENROUTER_APP_NAME
    return h


async def _chat_openrouter(prompt: str, model_override: Optional[str] = None) -> Optional[tuple[str, str]]:
    if not OPENROUTER_API_KEY:
        return None
    try:
        from openai import OpenAI

        model = (model_override or OPENROUTER_MODEL).strip() if (model_override or OPENROUTER_MODEL) else OPENROUTER_MODEL
        client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)
        headers = _openrouter_headers()

        def _call():
            return client.chat.completions.create(
                model=model,
                extra_headers=headers,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                ],
            )

        resp = await asyncio.to_thread(_call)
        text = (resp.choices[0].message.content or "").strip() if resp.choices else ""
        return (text, model) if text else None
    except Exception as e:
        print(f"[openrouter] error: {type(e).__name__}: {e}")
        return None


async def _chat_ollama(prompt: str, model_override: Optional[str] = None) -> Optional[tuple[str, str]]:
    model = (model_override or OLLAMA_MODEL).strip() if (model_override or OLLAMA_MODEL) else OLLAMA_MODEL
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"{OLLAMA_URL.rstrip('/')}/v1/chat/completions",
                json={"model": model, "messages": [{"role": "user", "content": prompt}], "stream": False},
            )
            r.raise_for_status()
            data = r.json()
            choices = data.get("choices") or []
            msg = (choices[0].get("message") if choices else None) or {}
            text = (msg.get("content") or "").strip()
            return (text, model) if text else None
    except Exception:
        return None


def _extract_first_json_object(text: str) -> Optional[dict]:
    """
    Extrait le premier objet JSON ({...}) d'un texte.

    Pourquoi:
    - Les LLM renvoient souvent du texte autour du JSON.
    - On isole le premier bloc qui "ressemble" a un objet JSON, puis on tente json.loads().

    Retour:
    - dict si parsing OK
    - None sinon
    """
    if not text:
        return None

    # Try a balanced-braces extraction first (more reliable than greedy regex).
    start = text.find("{")
    if start >= 0:
        depth = 0
        in_string = False
        escape = False
        for i in range(start, len(text)):
            ch = text[i]
            if in_string:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_string = False
                continue
            else:
                if ch == '"':
                    in_string = True
                    continue
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        candidate = text[start : i + 1]
                        try:
                            return json.loads(candidate)
                        except Exception:
                            break

    # Fallback: regex (keeps previous behavior).
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


def _extract_first_json_array(text: str) -> Optional[list]:
    """
    Extrait le premier tableau JSON ([...]) d'un texte.

    Utilise surtout par /rewards/generate (on attend une liste d'items).
    """
    if not text:
        return None

    start = text.find("[")
    if start >= 0:
        depth = 0
        in_string = False
        escape = False
        for i in range(start, len(text)):
            ch = text[i]
            if in_string:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_string = False
                continue
            else:
                if ch == '"':
                    in_string = True
                    continue
                if ch == "[":
                    depth += 1
                elif ch == "]":
                    depth -= 1
                    if depth == 0:
                        candidate = text[start : i + 1]
                        try:
                            return json.loads(candidate)
                        except Exception:
                            break

    m = re.search(r"\[[\s\S]*\]", text)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


def _build_rewards_suggest_prompt(req: RewardsSuggestRequest) -> str:
    parts = []
    parts.append("Tu es un assistant pour l'ecran 'Recompenses' de MatchMakers.")
    parts.append("Objectif: suggerer une recompense 'apaisée' (tone calme, juste, non-toxique).")
    parts.append("Tu dois produire UNIQUEMENT un objet JSON valide (pas de Markdown, pas de texte autour).")
    parts.append('Schema JSON strict: {"name":string,"description":string,"points":int,"rarity":("COMMON"|"RARE"|"EPIC"|"LEGENDARY"|null),"awardedBy":(string|null),"rationale":(string|null)}')
    parts.append("Contraintes:")
    parts.append("- name: <= 120 caracteres")
    parts.append("- description: 1 a 3 phrases, <= 300 caracteres")
    parts.append("- points: entier >= 0 (propose 5-150 en general)")
    parts.append("- rarity: coherente avec points (COMMON/RARE/EPIC/LEGENDARY) ou null")
    parts.append("- rationale: 1 phrase courte (<= 160 caracteres) expliquant le choix")
    parts.append("")
    parts.append("CONTEXTE (draft utilisateur, optionnel):")
    if req.goal:
        parts.append(f"- goal: {req.goal}")
    if req.type:
        parts.append(f"- type: {req.type}")
    if req.teamName:
        parts.append(f"- teamName: {req.teamName}")
    if req.dateAwarded:
        parts.append(f"- dateAwarded: {req.dateAwarded}")
    if req.currentName:
        parts.append(f"- currentName: {req.currentName}")
    if req.currentDescription:
        parts.append(f"- currentDescription: {req.currentDescription}")
    if req.currentPoints is not None:
        parts.append(f"- currentPoints: {req.currentPoints}")
    if req.currentRarity:
        parts.append(f"- currentRarity: {req.currentRarity}")
    parts.append("")
    parts.append("Rappels securite: ne demande jamais d'ID utilisateur, ne mentionne pas de donnees sensibles.")
    return "\n".join(parts)


def _build_rewards_insights_prompt(req: RewardsInsightsRequest) -> str:
    parts = []
    parts.append("Tu es un assistant pour l'ecran 'Recompenses' de MatchMakers.")
    parts.append("Reponds en francais avec un mini-document Markdown clair et apaisé.")
    parts.append("Format attendu: ## Resume, ## Observations, ## Actions (3), ## Risques (si applicable).")
    parts.append("Si une info manque, dis-le clairement.")
    if req.context and req.context.strip():
        parts.append("")
        parts.append("CONTEXTE (document):")
        parts.append(req.context.strip())
    parts.append("")
    parts.append("QUESTION:")
    parts.append(req.question.strip())
    return "\n".join(parts)


def _coerce_rarity(rarity: Optional[str], points: int) -> Optional[str]:
    """
    Normalise une rarity (string) en valeur attendue.

    - Si la rarity est valide (COMMON/RARE/EPIC/LEGENDARY) -> on la renvoie.
    - Sinon, on applique une heuristique simple basee sur les points.
    """
    if rarity:
        r = rarity.strip().upper()
        if r in {"COMMON", "RARE", "EPIC", "LEGENDARY"}:
            return r
    # Simple heuristic
    if points >= 120:
        return "LEGENDARY"
    if points >= 80:
        return "EPIC"
    if points >= 35:
        return "RARE"
    return "COMMON"


def _sanitize_rewards_suggestion(payload: Optional[dict]) -> tuple[dict, bool]:
    """
    Nettoie/valide une suggestion de recompense produite par un LLM.

    Garanties:
    - name/description non vides
    - points entier >= 0 (fallback a 10 si 0/absent)
    - rarity normalisee (via _coerce_rarity)
    - clamp longueurs (name/description/rationale)

    Retour:
    - (clean, from_llm)
      - from_llm=True si le payload original contenait des champs utiles
      - from_llm=False si on est essentiellement sur un fallback
    """
    if not isinstance(payload, dict):
        payload = {}

    name = str(payload.get("name") or "").strip()
    description = str(payload.get("description") or "").strip()
    awarded_by = payload.get("awardedBy")
    awarded_by = (str(awarded_by).strip() if awarded_by is not None else None) or None
    rationale = payload.get("rationale")
    rationale = (str(rationale).strip() if rationale is not None else None) or None

    pts_raw = payload.get("points")
    points = 0
    try:
        points = int(pts_raw)
    except Exception:
        points = 0
    if points < 0:
        points = 0

    rarity = _coerce_rarity(payload.get("rarity"), points)

    if not name:
        name = "Recompense positive"
    if len(name) > 120:
        name = name[:120].rstrip()
    if not description:
        description = "Une distinction attribuee pour valoriser un effort, une progression ou un esprit d'equipe."
    if len(description) > 300:
        description = description[:300].rstrip()
    if rationale and len(rationale) > 160:
        rationale = rationale[:160].rstrip()

    clean = {
        "name": name,
        "description": description,
        "points": points if points else 10,
        "rarity": rarity,
        "awardedBy": awarded_by,
        "rationale": rationale,
    }
    from_llm = bool(payload.get("name") or payload.get("description") or payload.get("points"))
    return clean, from_llm


def _build_rewards_generate_prompt(req: RewardsGenerateRequest) -> str:
    """
    Construit le prompt pour generer une liste de recompenses.

    Le prompt demande explicitement un JSON array "pur" (sans texte) afin de faciliter
    l'extraction (voir _extract_first_json_array) et la sanitization (voir _sanitize_generate_items).
    """
    parts = []
    parts.append("Tu es un assistant pour generer des recompenses de gamification (MatchMakers).")
    parts.append("Tu dois produire UNIQUEMENT un JSON array valide, sans texte autour.")
    parts.append('Schema item: {"name":string,"description":string,"type":string,"rarity":string,"points":int}')
    parts.append("Contraintes:")
    parts.append("- 5 a 10 items")
    parts.append("- name unique, <= 120 caracteres")
    parts.append("- description 1 a 2 phrases, <= 220 caracteres")
    parts.append("- type dans: TROPHY, MEDAL, CERTIFICATE, MVP, BEST_PLAYER, BEST_TEAM")
    parts.append("- rarity dans: COMMON, RARE, EPIC, LEGENDARY")
    parts.append("- points entier >= 0, adapte a rarity (ex: COMMON 5-25, RARE 20-60, EPIC 50-110, LEGENDARY 100-180)")
    parts.append("- Ton apaisé, positif, non-toxique, pas de moquerie, pas de donnees personnelles")
    parts.append("")
    parts.append("CONTEXTE:")
    parts.append(f"- eventType: {req.eventType}")
    parts.append(f"- teamCount: {req.teamCount}")
    parts.append(f"- difficulty: {req.difficulty}")
    return "\n".join(parts)


def _sanitize_generate_items(arr: Optional[list]) -> list[dict]:
    """
    Nettoie une liste d'items de generation afin de garantir un format stable.

    Regles principales:
    - ignore les elements non dict
    - name obligatoire + unique (case-insensitive)
    - clamp longueurs (name <= 120, description <= 220)
    - type/rarity limites aux enums attendus
    - points converti en int >= 0
    - max 10 items
    """
    if not isinstance(arr, list):
        return []
    out: list[dict] = []
    seen = set()
    for it in arr:
        if not isinstance(it, dict):
            continue
        name = str(it.get("name") or "").strip()
        desc = str(it.get("description") or "").strip()
        typ = str(it.get("type") or "").strip().upper()
        rar = str(it.get("rarity") or "").strip().upper()
        pts = it.get("points")
        try:
            points = int(pts)
        except Exception:
            points = 0
        if points < 0:
            points = 0
        if not name:
            continue
        if len(name) > 120:
            name = name[:120].rstrip()
        if not desc:
            desc = "Recompense attribuee pour valoriser une contribution positive."
        if len(desc) > 220:
            desc = desc[:220].rstrip()
        if typ not in {"TROPHY", "MEDAL", "CERTIFICATE", "MVP", "BEST_PLAYER", "BEST_TEAM"}:
            typ = "CERTIFICATE"
        if rar not in {"COMMON", "RARE", "EPIC", "LEGENDARY"}:
            rar = "COMMON"
        # ensure uniqueness (case-insensitive)
        k = name.strip().lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(
            {
                "name": name,
                "description": desc,
                "type": typ,
                "rarity": rar,
                "points": points,
            }
        )
        if len(out) >= 10:
            break
    return out


@app.post("/rewards/suggest", response_model=RewardsSuggestResponse)
async def rewards_suggest(req: RewardsSuggestRequest):
    t0 = time.time()
    prompt = _build_rewards_suggest_prompt(req)

    hit = await _chat_openrouter(prompt, req.model)
    if hit:
        text, model = hit
        payload = _extract_first_json_object(text)
        clean, ok = _sanitize_rewards_suggestion(payload)
        return RewardsSuggestResponse(
            **clean,
            from_llm=ok,
            model=model,
            latency_ms=int((time.time() - t0) * 1000),
        )

    hit = await _chat_ollama(prompt, req.model)
    if hit:
        text, model = hit
        payload = _extract_first_json_object(text)
        clean, ok = _sanitize_rewards_suggestion(payload)
        return RewardsSuggestResponse(
            **clean,
            from_llm=ok,
            model=model,
            latency_ms=int((time.time() - t0) * 1000),
        )

    clean, _ = _sanitize_rewards_suggestion(None)
    return RewardsSuggestResponse(
        **clean,
        from_llm=False,
        model=(req.model or (OPENROUTER_MODEL if OPENROUTER_API_KEY else OLLAMA_MODEL)),
        latency_ms=int((time.time() - t0) * 1000),
    )


@app.post("/rewards/insights", response_model=RewardsInsightsResponse)
async def rewards_insights(req: RewardsInsightsRequest):
    t0 = time.time()
    prompt = _build_rewards_insights_prompt(req)

    hit = await _chat_openrouter(prompt, req.model)
    if hit:
        text, model = hit
        return RewardsInsightsResponse(
            answer=text,
            from_llm=True,
            model=model,
            latency_ms=int((time.time() - t0) * 1000),
        )

    hit = await _chat_ollama(prompt, req.model)
    if hit:
        text, model = hit
        return RewardsInsightsResponse(
            answer=text,
            from_llm=True,
            model=model,
            latency_ms=int((time.time() - t0) * 1000),
        )

    hint = (
        "IA indisponible.\n\n"
        "Option A (OpenRouter): configure `OPENROUTER_API_KEY` puis relance PythonAI.\n"
        "Option B (gratuit): installe Ollama, puis `ollama serve`, puis `ollama pull gemma2:2b`.\n"
    )
    return RewardsInsightsResponse(
        answer=hint,
        from_llm=False,
        model=(req.model or (OPENROUTER_MODEL if OPENROUTER_API_KEY else OLLAMA_MODEL)),
        latency_ms=int((time.time() - t0) * 1000),
    )


@app.post("/rewards/generate", response_model=RewardsGenerateResponse)
async def rewards_generate(req: RewardsGenerateRequest):
    t0 = time.time()
    prompt = _build_rewards_generate_prompt(req)

    hit = await _chat_openrouter(prompt, req.model)
    if hit:
        text, model = hit
        arr = _extract_first_json_array(text)
        items = _sanitize_generate_items(arr)
        if items:
            return RewardsGenerateResponse(
                items=[RewardsGenerateItem(**it) for it in items],
                from_llm=True,
                model=model,
                latency_ms=int((time.time() - t0) * 1000),
            )

    hit = await _chat_ollama(prompt, req.model)
    if hit:
        text, model = hit
        arr = _extract_first_json_array(text)
        items = _sanitize_generate_items(arr)
        if items:
            return RewardsGenerateResponse(
                items=[RewardsGenerateItem(**it) for it in items],
                from_llm=True,
                model=model,
                latency_ms=int((time.time() - t0) * 1000),
            )

    # Deterministic fallback
    base = req.eventType.strip()[:40]
    diff = req.difficulty.strip().upper()
    mult = 3 if "HARD" in diff else (1 if "EASY" in diff else 2)
    fallback = [
        {"name": f"Esprit d'equipe - {base}", "description": "Recompense attribuee pour cohesion, entraide et communication positive.", "type": "BEST_TEAM", "rarity": "RARE", "points": 30 * mult},
        {"name": f"Progression - {base}", "description": "Distinction pour une progression visible et une regularite sereine.", "type": "CERTIFICATE", "rarity": "COMMON", "points": 15 * mult},
        {"name": f"MVP apaisé - {base}", "description": "MVP base sur impact global, fair-play et stabilite mentale.", "type": "MVP", "rarity": "EPIC", "points": 55 * mult},
        {"name": f"Defense solide - {base}", "description": "Recompense pour defense disciplinee et bonne coordination.", "type": "MEDAL", "rarity": "RARE", "points": 25 * mult},
        {"name": f"Momentum - {base}", "description": "Trophee pour gestion du stress et retournement calme.", "type": "TROPHY", "rarity": "EPIC", "points": 45 * mult},
    ]
    return RewardsGenerateResponse(
        items=[RewardsGenerateItem(**it) for it in fallback],
        from_llm=False,
        model=(req.model or (OPENROUTER_MODEL if OPENROUTER_API_KEY else OLLAMA_MODEL)),
        latency_ms=int((time.time() - t0) * 1000),
    )


@app.post("/leaderboard", response_model=LeaderboardResponse)
async def leaderboard(req: LeaderboardRequest):
    t0 = time.time()
    prompt = _build_prompt(req)

    hit = await _chat_openrouter(prompt, req.model)
    if hit:
        text, model = hit
        return LeaderboardResponse(
            answer=text,
            from_llm=True,
            model=model,
            latency_ms=int((time.time() - t0) * 1000),
        )

    hit = await _chat_ollama(prompt, req.model)
    if hit:
        text, model = hit
        return LeaderboardResponse(
            answer=text,
            from_llm=True,
            model=model,
            latency_ms=int((time.time() - t0) * 1000),
        )

    # Fallback: keep UI usable even if Ollama isn't installed/running.
    hint = (
        "IA indisponible.\n\n"
        "Option A (OpenRouter): configure `OPENROUTER_API_KEY` puis relance PythonAI.\n"
        "Option B (gratuit): installe Ollama, puis `ollama serve`, puis `ollama pull gemma2:2b`.\n"
    )
    return LeaderboardResponse(
        answer=hint,
        from_llm=False,
        model=(req.model or (OPENROUTER_MODEL if OPENROUTER_API_KEY else OLLAMA_MODEL)),
        latency_ms=int((time.time() - t0) * 1000),
    )


