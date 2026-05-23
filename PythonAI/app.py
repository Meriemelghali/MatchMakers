import os
import time
from typing import Optional, List
import asyncio
import json
import re
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json

# For AI Recommendation
from recommendation.scoring import calculate_final_score

try:
    from detoxify import Detoxify
    import pandas as pd
    TOXICITY_MODEL_NAME = os.getenv("TOXICITY_MODEL", "multilingual")
    TOXICITY_DEVICE = os.getenv("TOXICITY_DEVICE", "cpu")
    TOXICITY_THRESHOLD = float(os.getenv("TOXICITY_THRESHOLD", "0.5"))
    print(f"Loading Toxicity model '{TOXICITY_MODEL_NAME}'...")
    toxicity_model = Detoxify(TOXICITY_MODEL_NAME, device=TOXICITY_DEVICE)
    print("Toxicity model loaded successfully.")
except Exception as e:
    print(f"Error loading toxicity model: {e}")
    toxicity_model = None


OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-super-120b-a12b:free")
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "").strip()
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "MatchMakers").strip()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma2:2b")


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────────────────

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


class ToxicityRequest(BaseModel):
    text: str

class ToxicityResponse(BaseModel):
    is_toxic: bool
    scores: dict
    verdict: str


class RecommendationContext(BaseModel):
    """Contexte enrichi pour personnaliser les recommandations."""
    sport_type: Optional[str] = None
    user_history: Optional[List[dict]] = []      # Réservations passées de l'utilisateur
    all_reservations: Optional[List[dict]] = []  # Toutes les réservations (pour popularité)


class RecommendationRequest(BaseModel):
    date_heure: str
    terrains: list
    context: Optional[RecommendationContext] = None  # NOUVEAU: contexte enrichi


class RecommendationResponse(BaseModel):
    recommandations: list


class EvaluationRequest(BaseModel):
    date_heure: str
    terrain: dict
    context: Optional[RecommendationContext] = None  # NOUVEAU


class EvaluationResponse(BaseModel):
    score: float
    verdict: str
    raisons: list
    details: dict


class BestSlotsRequest(BaseModel):
    base_date: str  # YYYY-MM-DD
    terrain: dict
    context: Optional[RecommendationContext] = None  # NOUVEAU


class BestSlotsResponse(BaseModel):
    slots: list  # List of {date_heure, score, raisons, verdict}


class HeatmapRequest(BaseModel):
    """NOUVEAU: Requête pour la heatmap de disponibilités."""
    terrain_ids: List[str]
    terrains: List[dict]
    start_date: str   # YYYY-MM-DD
    days: Optional[int] = 7
    sport_type: Optional[str] = None
    user_history: Optional[List[dict]] = []
    all_reservations: Optional[List[dict]] = []


class HeatmapSlot(BaseModel):
    date: str
    hour: int
    score: float
    available: bool
    verdict: str


class HeatmapEntry(BaseModel):
    terrain_id: str
    slots: List[HeatmapSlot]


class HeatmapResponse(BaseModel):
    heatmap: List[HeatmapEntry]


# ─────────────────────────────────────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="MatchMakers Python AI", version="0.3.0")
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
    return {
        "ok": True,
        "version": "0.3.0",
        "ollama_url": OLLAMA_URL,
        "default_model": OLLAMA_MODEL,
        "toxicity_model": TOXICITY_MODEL_NAME if toxicity_model else "not_loaded"
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


# ─────────────────────────────────────────────────────────────────────────────
# LLM Leaderboard Endpoint
# ─────────────────────────────────────────────────────────────────────────────

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


def _build_rewards_suggest_prompt(req: 
                                 ) -> str:
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

    hint = (
        "IA indisponible.\n\n"
        "Option A (OpenRouter): configure `OPENROUTER_API_KEY` puis relance PythonAI.\n"
        "Option B (gratuit): installe Ollama, puis `ollama serve`, puis `ollama pull gemma2:2b`.\n"
    )

class QuoteRequest(BaseModel):
    sports: List[str]

class QuoteResponse(BaseModel):
    quote: str
    from_llm: bool
    model: Optional[str] = None
    latency_ms: int


@app.post("/api/ai/sport-quote", response_model=QuoteResponse)
async def sport_quote(req: QuoteRequest):
    t0 = time.time()
    sports_str = ", ".join(req.sports) if req.sports else "sports en général"
    
    prompt = f"""
    Tu es un expert en culture sportive pour la plateforme MatchMakers.
    L'utilisateur est fan de : {sports_str}.
    
    Ta mission : Donne soit un "Fun Fact" sportif fascinant (anecdote incroyable, record insolite), soit une citation motivante.
    Exemple : "Savais-tu que Cristiano Ronaldo saute plus haut qu'un joueur NBA moyen ?"
    
    Règles :
    - Langue : Français
    - Style : Captivant, éducatif et court
    - Longueur : Max 2 phrases
    - Pas de titres, pas de markdown.
    """

    # 1. Try OpenRouter
    if OPENROUTER_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)
            model = OPENROUTER_MODEL
            
            def _call():
                return client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                )
            
            resp = await asyncio.to_thread(_call)
            text = resp.choices[0].message.content.strip() if resp.choices else ""
            if text:
                return QuoteResponse(
                    quote=text,
                    from_llm=True,
                    model=model,
                    latency_ms=int((time.time() - t0) * 1000)
                )
        except Exception as e:
            print(f"[OpenRouter Quote Error]: {e}")

    # 2. Try Ollama (Local)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{OLLAMA_URL.rstrip('/')}/v1/chat/completions",
                json={"model": OLLAMA_MODEL, "messages": [{"role": "user", "content": prompt}], "stream": False},
            )
            r.raise_for_status()
            text = r.json()["choices"][0]["message"]["content"].strip()
            return QuoteResponse(
                quote=text,
                from_llm=True,
                model=OLLAMA_MODEL,
                latency_ms=int((time.time() - t0) * 1000)
            )
    except Exception:
        pass

    # 3. Fallback
    import random
    fallbacks = [
        "Savais-tu que le golf est le seul sport à avoir été pratiqué sur la Lune ?",
        "Cristiano Ronaldo saute plus haut qu'un joueur NBA moyen.",
        "Le sifflet d'arbitre n'a été utilisé pour la première fois qu'en 1878.",
        "Le basket-ball a été inventé en utilisant un panier de pêches comme panier !"
    ]
    return QuoteResponse(
        quote=random.choice(fallbacks),
        from_llm=False,
        model="static-fallback",
        latency_ms=int((time.time() - t0) * 1000)
    )

class ProductChatRequest(BaseModel):
    question: str = Field(min_length=1)
    products_context: Optional[str] = None  # liste des produits en JSON
    model: Optional[str] = None
# --- COACH IA ENDPOINTS ---

class CoachRequest(BaseModel):
    userId: str
    level: str
    goals: List[str]
    sports: List[str]
    weight: Optional[float] = None
    height: Optional[float] = None

class Exercise(BaseModel):
    name: str
    sets: str
    reps: str
    rest: str
    tip: str

class CoachPlanResponse(BaseModel):
    title: str
    focus: str
    warmup: List[str]
    exercises: List[Exercise]
    cooldown: List[str]
    nutritionTip: str
    from_llm: bool

class ChatRequest(BaseModel):
    userId: str
    message: str
    context: Optional[dict] = None

class ChatResponse(BaseModel):
    reply: str
    from_llm: bool

@app.post("/api/ai/coach/plan", response_model=CoachPlanResponse)
async def generate_coach_plan(req: CoachRequest):
    t0 = time.time()
    level_fr = {"BEGINNER": "Débutant", "INTERMEDIATE": "Intermédiaire", "ADVANCED": "Avancé", "PRO": "Professionnel"}.get(req.level, "Débutant")
    goals_str = ", ".join(req.goals) if req.goals else "Remise en forme"
    sports_str = ", ".join(req.sports) if req.sports else "Fitness"
    
    prompt = f"""
    Tu es un Coach Sportif Expert pour MatchMakers. 
    Génère un programme d'entraînement du jour pour un utilisateur :
    - Niveau : {level_fr}
    - Objectifs : {goals_str}
    - Sports favoris : {sports_str}
    - Poids : {req.weight}kg, Taille : {req.height}cm
    
    Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
    {{
        "title": "Nom de la séance",
        "focus": "Objectif principal (ex: Cardio, Force)",
        "warmup": ["Etape 1", "Etape 2"],
        "exercises": [
            {{"name": "Nom", "sets": "Nb séries", "reps": "Répétitions", "rest": "Repos", "tip": "Conseil technique"}}
        ],
        "cooldown": ["Etape 1", "Etape 2"],
        "nutritionTip": "Un conseil nutritionnel court"
    }}
    """

    try:
        # Priorité OpenRouter/OpenAI
        if OPENROUTER_API_KEY:
            from openai import OpenAI
            client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)
            resp = await asyncio.to_thread(lambda: client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=[{"role": "user", "content": prompt}]
            ))
            text = resp.choices[0].message.content.strip()
            if "```json" in text: text = text.split("```json")[1].split("```")[0].strip()
            data = json.loads(text)
            data["from_llm"] = True
            return data
    except Exception as e:
        print(f"Coach Plan AI Error: {e}")

    # Fallback Statique Premium
    return {
        "title": f"Session {sports_str} Elite",
        "focus": "Condition globale",
        "warmup": ["5 min de jumping jacks", "Rotations articulaires"],
        "exercises": [
            {"name": "Pompes", "sets": "3", "reps": "12", "rest": "45s", "tip": "Gardez le dos bien droit"},
            {"name": "Squats", "sets": "4", "reps": "15", "rest": "1min", "tip": "Poussez sur les talons"}
        ],
        "cooldown": ["Étirements statiques", "Hydratation"],
        "nutritionTip": "Pensez à consommer des protéines après cette séance.",
        "from_llm": False
    }

@app.post("/api/ai/coach/chat", response_model=ChatResponse)
async def coach_chat(req: ChatRequest):
    prompt = f"""
    Tu es un Coach Sportif personnel virtuel nommé 'MatchCoach'. 
    Tu es expert, motivant, et tu parles en français.
    L'utilisateur demande : "{req.message}"
    Réponds de manière concise (max 3 phrases). Reste dans le domaine sportif.
    """
    
    try:
        if OPENROUTER_API_KEY:
            from openai import OpenAI
            client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)
            resp = await asyncio.to_thread(lambda: client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=[{"role": "user", "content": prompt}]
            ))
            return {"reply": resp.choices[0].message.content.strip(), "from_llm": True}
    except Exception:
        pass
        
    return {"reply": "Je suis votre coach MatchMakers ! Je suis là pour vous aider à atteindre vos sommets. Posez-moi une question sur vos exercices.", "from_llm": False}


class ProductChatResponse(BaseModel):
    answer: str
    from_llm: bool
    model: Optional[str] = None
    latency_ms: int


def _build_product_prompt(req: ProductChatRequest) -> str:
    parts = []
    parts.append("Tu es un assistant commercial pour la boutique sportive MatchMakers.")
    parts.append("Tu aides les clients à trouver des produits sportifs.")
    parts.append("Réponds en français, de façon concise et utile (5-8 lignes max).")
    parts.append("Si un produit correspond à la question, mentionne son nom et son prix.")
    parts.append("Si aucun produit ne correspond, dis-le poliment.")
    parts.append("Ne réponds qu'aux questions liées aux produits sportifs.")

    if req.products_context and req.products_context.strip():
        parts.append("")
        parts.append("LISTE DES PRODUITS DISPONIBLES:")
        parts.append(req.products_context.strip())

    parts.append("")
    parts.append("QUESTION DU CLIENT:")
    parts.append(req.question.strip())
    return "\n".join(parts)


@app.post("/products-chat", response_model=ProductChatResponse)
async def products_chat(req: ProductChatRequest):
    t0 = time.time()
    model = (req.model or OLLAMA_MODEL).strip()
    prompt = _build_product_prompt(req)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"{OLLAMA_URL.rstrip('/')}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False
                },
            )
            r.raise_for_status()
            data = r.json()
            choices = data.get("choices") or []
            msg = (choices[0].get("message") if choices else None) or {}
            text = (msg.get("content") or "").strip()
            if text:
                return ProductChatResponse(
                    answer=text,
                    from_llm=True,
                    model=model,
                    latency_ms=int((time.time() - t0) * 1000),
                )
    except Exception:
        pass

    return ProductChatResponse(
        answer="Je suis désolé, le service IA n'est pas disponible. Veuillez réessayer plus tard.",
        from_llm=False,
        model=model,
        latency_ms=int((time.time() - t0) * 1000),
    )

# ───── RECOMMENDATION MODELS ─────
from typing import List

class ProductData(BaseModel):
    id: str
    name: str
    sport: str
    type: str           # SALE / RENTAL / BOTH
    averageRating: float
    totalReviews: int
    totalOrders: int

class RecommendRequest(BaseModel):
    products: List[ProductData]
    userSport: Optional[str] = None
    excludeId: Optional[str] = None
    topK: int = 6

class SimilarRequest(BaseModel):
    targetProduct: ProductData
    candidates: List[ProductData]
    topK: int = 4

class ScoredProduct(BaseModel):
    id: str
    score: float
    reason: str
    
    
    # ───── SCORING LOGIC ─────
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

def _compute_scores(
    products: List[ProductData],
    user_sport: Optional[str] = None,
    exclude_id: Optional[str] = None
) -> List[ScoredProduct]:
    """
    Pondération :
      40% rating moyen
      40% nombre de commandes
      20% bonus sport du user connecté
    """
    df = pd.DataFrame([p.dict() for p in products])
    if exclude_id:
        df = df[df["id"] != exclude_id]
    if df.empty:
        return []

    scaler = MinMaxScaler()
    df["rating_norm"] = scaler.fit_transform(df[["averageRating"]].fillna(0))
    df["orders_norm"] = scaler.fit_transform(df[["totalOrders"]].fillna(0))

    df["sport_bonus"] = 0.0
    if user_sport:
        df.loc[
            df["sport"].str.lower() == user_sport.lower(),
            "sport_bonus"
        ] = 0.2

    df["score"] = (
        0.40 * df["rating_norm"] +
        0.40 * df["orders_norm"] +
        0.20 * df["sport_bonus"]
    )
    df = df.sort_values("score", ascending=False)

    results = []
    for _, row in df.iterrows():
        if row["sport_bonus"] > 0 and row["score"] > 0.7:
            reason = f"Parfait pour {user_sport}"
        elif row["rating_norm"] >= row["orders_norm"]:
            reason = f"★ {row['averageRating']:.1f} — top noté"
        else:
            reason = f"{int(row['totalOrders'])} commandes"

        results.append(ScoredProduct(
            id=row["id"],
            score=round(float(row["score"]), 4),
            reason=reason
        ))
    return results


def _compute_similar(
    target: ProductData,
    candidates: List[ProductData]
) -> List[ScoredProduct]:
    """
    Similarité :
      50% même sport
      20% même type
      20% rating proche
      10% commandes proches
    """
    results = []
    for c in candidates:
        if c.id == target.id:
            continue

        score = 0.0
        reasons = []

        if c.sport == target.sport:
            score += 0.50
            reasons.append(f"Même sport ({c.sport})")

        if c.type == target.type:
            score += 0.20
            reasons.append("Même type")

        rating_diff = abs(c.averageRating - target.averageRating)
        score += max(0.0, 0.20 * (1 - rating_diff / 5))

        orders_diff = abs(c.totalOrders - target.totalOrders)
        score += max(0.0, 0.10 * (1 - min(orders_diff, 100) / 100))

        results.append(ScoredProduct(
            id=c.id,
            score=round(score, 4),
            reason=", ".join(reasons) if reasons else "Produit similaire"
        ))

    results.sort(key=lambda x: x.score, reverse=True)
    return results


# ───── RECOMMENDATION ENDPOINTS ─────

@app.post("/recommend", response_model=List[ScoredProduct])
def recommend(req: RecommendRequest):
    """
    Retourne les topK produits les mieux scorés.
    Appelé par Spring Product Service → page liste produits.
    """
    scored = _compute_scores(
        req.products,
        user_sport=req.userSport,
        exclude_id=req.excludeId
    )
    return scored[:req.topK]


# ─────────────────────────────────────────────────────────────────────────────
# Toxicity Endpoint
# ─────────────────────────────────────────────────────────────────────────────

def get_verdict(scores, threshold):
    global_score = max(scores.values())
    if global_score >= 0.8:
        return "CRITICAL"
    elif global_score >= threshold:
        return "TOXIC"
    elif global_score >= threshold * 0.6:
        return "AMBIGUOUS"
    else:
        return "SAFE"


@app.post("/analyze", response_model=ToxicityResponse)
async def analyze_text(request: ToxicityRequest):
    if toxicity_model is None:
        raise HTTPException(status_code=503, detail="Toxicity model is not loaded.")
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    try:
        results = toxicity_model.predict([request.text])
        scores = {k: float(v[0]) for k, v in results.items()}
        global_score = max(scores.values())
        is_toxic = global_score >= TOXICITY_THRESHOLD
        verdict = get_verdict(scores, TOXICITY_THRESHOLD)
        return ToxicityResponse(is_toxic=is_toxic, scores=scores, verdict=verdict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Recommendation Endpoint (v2 — enrichi)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/recommend", response_model=RecommendationResponse)
async def recommend_terrains(req: RecommendationRequest):
    try:
        ctx = {}
        if req.context:
            ctx = {
                "sport_type":       req.context.sport_type or "",
                "user_history":     req.context.user_history or [],
                "all_reservations": req.context.all_reservations or [],
            }

        recommandations = []
        for t in req.terrains:
            result = calculate_final_score(t, req.date_heure, context=ctx)
            recommandations.append({
                "terrain_id": t.get("id", t.get("_id")),
                "score":      result["score"],
                "verdict":    result.get("verdict", ""),
                "raisons":    result["raisons"],
                "details":    result["details"],
            })

        recommandations.sort(key=lambda x: x["score"], reverse=True)
        return {"recommandations": recommandations}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Evaluation Endpoint (v2)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_choice(req: EvaluationRequest):
    try:
        ctx = {}
        if req.context:
            ctx = {
                "sport_type":       req.context.sport_type or "",
                "user_history":     req.context.user_history or [],
                "all_reservations": req.context.all_reservations or [],
            }

        result = calculate_final_score(req.terrain, req.date_heure, context=ctx)
        return EvaluationResponse(
            score=result["score"],
            verdict=result.get("verdict", ""),
            raisons=result["raisons"],
            details=result["details"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Best Slots Endpoint (v2)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/best-slots", response_model=BestSlotsResponse)
async def get_best_slots(req: BestSlotsRequest):
    """
    Identifie les meilleurs créneaux pour un terrain donné sur une journée.
    Évalue chaque heure entre 7h et 22h.
    """
    try:
        from datetime import datetime, timedelta

        ctx = {}
        if req.context:
            ctx = {
                "sport_type":       req.context.sport_type or "",
                "user_history":     req.context.user_history or [],
                "all_reservations": req.context.all_reservations or [],
            }

        # Parse base_date (accepte ISO datetime ou date seule)
        try:
            base = datetime.fromisoformat(req.base_date)
        except Exception:
            base = datetime.strptime(req.base_date[:10], "%Y-%m-%d")

        slots = []
        # Évaluer toutes les heures entre 7h et 22h sur 3 jours
        for day_offset in range(3):
            day = base + timedelta(days=day_offset)
            for hour in range(7, 23):
                candidate_dt = day.replace(hour=hour, minute=0, second=0, microsecond=0)
                candidate_str = candidate_dt.isoformat()

                result = calculate_final_score(req.terrain, candidate_str, context=ctx)
                slots.append({
                    "date_heure": candidate_str,
                    "score":      result["score"],
                    "verdict":    result.get("verdict", ""),
                    "raisons":    result["raisons"][:2],
                })

        # Trier et garder le top 6
        slots.sort(key=lambda x: x["score"], reverse=True)
        return {"slots": slots[:6]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# NOUVEAU: Smart Heatmap Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/heatmap", response_model=HeatmapResponse)
async def get_availability_heatmap(req: HeatmapRequest):
    """
    Génère une heatmap de disponibilité/score pour plusieurs terrains sur N jours.
    Retourne une grille [terrain][jour][heure] avec scores et disponibilités.
    Créneaux évalués: 8h, 10h, 12h, 14h, 16h, 18h, 20h (7 créneaux / jour).
    """
    try:
        from datetime import datetime, timedelta

        ctx = {
            "sport_type":       req.sport_type or "",
            "user_history":     req.user_history or [],
            "all_reservations": req.all_reservations or [],
        }

        try:
            start = datetime.strptime(req.start_date[:10], "%Y-%m-%d")
        except Exception:
            start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        hours_to_check = [8, 10, 12, 14, 16, 18, 20]
        days = min(req.days or 7, 14)  # Max 14 jours

        heatmap = []
        terrain_map = {t.get("id", ""): t for t in req.terrains}

        # Indexer les réservations par terrain pour plus de performance
        reservations_by_terrain = {}
        for res in (req.all_reservations or []):
            tid = res.get("terrainId")
            if tid not in reservations_by_terrain:
                reservations_by_terrain[tid] = []
            reservations_by_terrain[tid].append(res)

        for tid in req.terrain_ids:
            terrain_orig = terrain_map.get(tid)
            if not terrain_orig:
                continue

            slots: list[HeatmapSlot] = []
            terrain_res = reservations_by_terrain.get(tid, [])

            for day_offset in range(days):
                day = start + timedelta(days=day_offset)
                for hour in hours_to_check:
                    slot_dt = day.replace(hour=hour, minute=0, second=0, microsecond=0)
                    slot_str = slot_dt.isoformat()

                    # Compter les réservations pour ce créneau précis
                    count = 0
                    active_res_info = ""
                    slot_end = slot_dt + timedelta(hours=1) # On considère des créneaux d'une heure pour l'affichage

                    for r in terrain_res:
                        if r.get("statutR") == "CANCELLED":
                            continue
                        s_str = r.get("startTimeR")
                        e_str = r.get("endTimeR")
                        if not s_str or not e_str:
                            continue
                            
                        try:
                            # Parse and strip timezone for safe comparison
                            r_start = datetime.fromisoformat(s_str.replace('Z', '')).replace(tzinfo=None)
                            r_end = datetime.fromisoformat(e_str.replace('Z', '')).replace(tzinfo=None)
                            
                            # Logique d'intersection d'intervalles : [s1, e1] et [s2, e2] se chevauchent si s1 < e2 et s2 < e1
                            if slot_dt < r_end and r_start < slot_end:
                                count += 1
                                t_str = r_start.strftime("%H:%M")
                                active_res_info = f"Occupé à {t_str}"
                                print(f"[DEBUG_HEATMAP] Overlap found: Slot {slot_dt} overlaps with Res {r.get('idReservation')} ({t_str})")
                        except Exception as ex:
                            print(f"[DEBUG_HEATMAP] Error parsing dates: {ex}")
                            continue

                    # Injecter le compte actuel dans le dictionnaire terrain pour le scoring
                    terrain = terrain_orig.copy()
                    terrain["reservations_actuelles"] = 1 if count > 0 else 0
                    
                    result = calculate_final_score(terrain, slot_str, context=ctx)

                    # Un terrain est considéré comme complet dès qu'il y a 1 réservation
                    # OU si le créneau est déjà passé
                    now = datetime.now().replace(tzinfo=None)
                    is_past = slot_dt < now
                    available = (count == 0) and not is_past

                    slots.append(HeatmapSlot(
                        date=day.strftime("%Y-%m-%d"),
                        hour=hour,
                        score=result["score"] if available else 0.0,
                        available=available,
                        verdict=result.get("verdict", "") if available else (active_res_info if count > 0 else "Déjà passé"),
                    ))

            heatmap.append(HeatmapEntry(terrain_id=tid, slots=slots))

        return HeatmapResponse(heatmap=heatmap)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/similar", response_model=List[ScoredProduct])
def similar(req: SimilarRequest):
    """
    Retourne les produits les plus similaires au produit cible.
    Appelé par Spring → page détail produit.
    """
    scored = _compute_similar(req.targetProduct, req.candidates)
    return scored[:req.topK]
