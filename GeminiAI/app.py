"""
MatchMakers – Gemini AI Service
--------------------------------
Brand-new, independent service (port 8002).
Does NOT share code with PythonAI/.

Endpoints:
  GET  /health
  POST /matchmaking    – pick the best opponent for a team
  POST /match-summary  – narrate a finished match from its events

Model auto-discovery: on startup the service calls ListModels and picks
the best available generateContent-capable model automatically.
No hardcoded model names.
"""

import asyncio
import json
import os
import re
import time
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL_ENV = os.getenv("GEMINI_MODEL", "")   # optional override

_BASE = "https://generativelanguage.googleapis.com"

# Filled by startup discovery
_active_version:    str       = "v1beta"
_active_model:      str       = GEMINI_MODEL_ENV or "gemini-2.0-flash-lite"
_discovered_models: list[str] = []   # all capable models found, in preference order


# ---------------------------------------------------------------------------
# Model preference order  (put cheapest/free-tier-friendliest first)
# ---------------------------------------------------------------------------

_PREFERRED = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-preview",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash-8b-001",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
]


async def _discover_model() -> None:
    """
    Calls ListModels, builds a ranked list of ALL capable models,
    and sets _active_model/_active_version/_discovered_models.
    """
    global _active_model, _active_version, _discovered_models

    if not GEMINI_API_KEY:
        print("[GeminiAI] No API key – skipping model discovery.")
        return

    for version in ("v1beta", "v1"):
        try:
            async with httpx.AsyncClient(timeout=10.0) as c:
                r = await c.get(
                    f"{_BASE}/{version}/models",
                    params={"key": GEMINI_API_KEY},
                )
                if r.status_code != 200:
                    continue

                raw = r.json().get("models", [])
                capable = [
                    m["name"].replace("models/", "")
                    for m in raw
                    if "generateContent" in m.get("supportedGenerationMethods", [])
                ]

                if not capable:
                    continue

                # Sort by preference list, then alphabetically for the rest
                def rank(name: str) -> int:
                    try:
                        return _PREFERRED.index(name)
                    except ValueError:
                        return len(_PREFERRED) + 1

                capable.sort(key=rank)
                _discovered_models = capable
                _active_model      = capable[0]
                _active_version    = version

                print(f"[GeminiAI] {len(capable)} models available via {version}")
                print(f"[GeminiAI] Will try in order: {capable[:5]}")
                return

        except Exception as exc:
            print(f"[GeminiAI] Discovery error on {version}: {exc}")

    print(f"[GeminiAI] Discovery failed – using default: {_active_model}")


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    await _discover_model()
    yield


app = FastAPI(title="MatchMakers Gemini AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------

async def _call_gemini(prompt: str) -> tuple[str, bool]:
    """
    Tries each discovered model in order.
    On 429 → moves to the next model immediately (no long wait).
    On other errors → short backoff then next model.
    """
    if not GEMINI_API_KEY:
        return (
            "Gemini API key not configured. "
            "Set GEMINI_API_KEY in GeminiAI/.env and restart.",
            False,
        )

    models_to_try = _discovered_models if _discovered_models else [_active_model]
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    for model in models_to_try:
        url = f"{_BASE}/{_active_version}/models/{model}:generateContent"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                r = await client.post(url, json=payload, params={"key": GEMINI_API_KEY})

                if r.status_code == 429:
                    print(f"[GeminiAI] {model} is rate-limited → trying next model")
                    continue   # skip to next model, no waiting

                r.raise_for_status()
                data = r.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                print(f"[GeminiAI] Success with {model}")
                return (text, True)

        except Exception as exc:
            print(f"[GeminiAI] {model} failed: {exc} → trying next model")
            continue

    return (
        "All available Gemini models are currently rate-limited. "
        "Try again in a minute.",
        False,
    )


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "ok":                 True,
        "active_version":     _active_version,
        "models_available":   _discovered_models,
        "api_key_configured": bool(GEMINI_API_KEY),
    }


# ---------------------------------------------------------------------------
# /matchmaking
# ---------------------------------------------------------------------------

class TeamInfo(BaseModel):
    id:          Optional[str] = None
    name:        str
    sport:       str
    city:        Optional[str] = None
    country:     Optional[str] = None
    coachName:   Optional[str] = None
    memberCount: Optional[int] = None
    description: Optional[str] = None


class MatchmakingRequest(BaseModel):
    team:       TeamInfo
    candidates: list[TeamInfo] = Field(default_factory=list)


class MatchmakingSuggestion(BaseModel):
    teamId:   Optional[str]
    teamName: str
    score:    int
    reason:   str


class MatchmakingResponse(BaseModel):
    suggestions: list[MatchmakingSuggestion]
    analysis:    str
    from_llm:    bool
    latency_ms:  int


def _build_matchmaking_prompt(req: MatchmakingRequest) -> str:
    t = req.team
    lines = [
        "You are a sports matchmaking assistant for the MatchMakers platform.",
        "Your job: analyse the requesting team and rank the best opponent candidates.",
        "",
        "## Requesting team",
        f"  Name        : {t.name}",
        f"  Sport       : {t.sport}",
        f"  City        : {t.city or 'unknown'}",
        f"  Country     : {t.country or 'unknown'}",
        f"  Coach       : {t.coachName or 'unknown'}",
        f"  Members     : {t.memberCount or 'unknown'}",
        f"  Description : {t.description or '—'}",
        "",
        "## Candidate teams",
    ]
    for i, c in enumerate(req.candidates, 1):
        lines.append(
            f"  {i}. {c.name} | Sport: {c.sport} | City: {c.city or '?'} "
            f"| Members: {c.memberCount or '?'} | Coach: {c.coachName or '?'}"
        )
    lines += [
        "",
        "## Task",
        "Select the top-3 best opponents for the requesting team.",
        "Consider: same sport, similar member count, geographic proximity, competitive balance.",
        "For EACH suggestion return a JSON object with these exact keys:",
        '  { "teamId": "<id or null>", "teamName": "<name>", "score": <0-100>, "reason": "<1-2 sentences>" }',
        "",
        "Then write a short overall ANALYSIS paragraph (3-5 sentences) explaining your choices.",
        "",
        "Respond ONLY in this format (no markdown fences):",
        "SUGGESTIONS:",
        "<JSON array of 3 objects>",
        "ANALYSIS:",
        "<paragraph>",
    ]
    return "\n".join(lines)


def _parse_matchmaking(text: str) -> tuple[list[dict], str]:
    """
    Single-pass parser. Finds the balanced JSON array, extracts suggestions,
    then takes everything AFTER the closing bracket as the analysis.
    This avoids any regex ambiguity about where the JSON ends.
    """
    clean = re.sub(r"```(?:json)?|```", "", text).strip()

    start = clean.find("[")
    if start == -1:
        return [], ""

    depth, end = 0, -1
    for i, ch in enumerate(clean[start:], start):
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                end = i
                break

    if end == -1:
        return [], ""

    # Parse suggestions from the JSON block
    suggestions = []
    try:
        raw = json.loads(clean[start : end + 1])
        for item in raw[:3]:
            suggestions.append({
                "teamId":   item.get("teamId"),
                "teamName": item.get("teamName", ""),
                "score":    max(0, min(100, int(item.get("score", 50)))),
                "reason":   item.get("reason", ""),
            })
    except Exception:
        pass

    # Analysis = everything AFTER the closing bracket, stripped of headers
    after = clean[end + 1:].strip()
    after = re.sub(r"^ANALYSIS:\s*", "", after, flags=re.IGNORECASE).strip()

    return suggestions, after


@app.post("/matchmaking", response_model=MatchmakingResponse)
async def matchmaking(req: MatchmakingRequest):
    if not req.candidates:
        raise HTTPException(status_code=400, detail="candidates list is empty")

    t0 = time.time()
    prompt = _build_matchmaking_prompt(req)
    text, from_llm = await _call_gemini(prompt)
    latency = int((time.time() - t0) * 1000)

    suggestions: list[MatchmakingSuggestion] = []
    analysis = ""

    if from_llm:
        raw, analysis = _parse_matchmaking(text)
        for item in raw:
            suggestions.append(MatchmakingSuggestion(**item))

    if not suggestions:
        for c in req.candidates[:3]:
            suggestions.append(MatchmakingSuggestion(
                teamId=c.id, teamName=c.name, score=70,
                reason="Suggested based on same sport.",
            ))
        analysis = analysis or "Analyse indisponible."

    return MatchmakingResponse(
        suggestions=suggestions, analysis=analysis,
        from_llm=from_llm, latency_ms=latency,
    )


# ---------------------------------------------------------------------------
# /match-summary
# ---------------------------------------------------------------------------

class MatchEvent(BaseModel):
    type:        str
    minute:      Optional[int] = None
    joueur:      Optional[str] = None
    equipe:      Optional[str] = None
    description: Optional[str] = None


class MatchData(BaseModel):
    titre:        str
    equipe1:      str
    equipe2:      str
    scoreEquipe1: Optional[int] = None
    scoreEquipe2: Optional[int] = None
    type:         Optional[str] = None
    statut:       Optional[str] = None
    evenements:   list[MatchEvent] = Field(default_factory=list)


class SummaryRequest(BaseModel):
    match: MatchData


class SummaryResponse(BaseModel):
    summary:    str
    from_llm:   bool
    latency_ms: int


def _build_summary_prompt(req: SummaryRequest) -> str:
    m = req.match
    score = f"{m.scoreEquipe1} – {m.scoreEquipe2}" if m.scoreEquipe1 is not None else "N/A"
    events_lines = []
    for e in m.evenements:
        team_label = (
            m.equipe1 if e.equipe == "equipe1"
            else m.equipe2 if e.equipe == "equipe2"
            else e.equipe or ""
        )
        minute = f"{e.minute}'" if e.minute is not None else "?"
        events_lines.append(
            f"  {minute} – {e.type.replace('_', ' ')} | {e.joueur or 'unknown'} ({team_label})"
        )
    events_text = "\n".join(events_lines) if events_lines else "  No events recorded."
    return "\n".join([
        "You are a professional sports commentator for the MatchMakers platform.",
        "Write an engaging post-match narrative summary in French.",
        "Style: journalistic, vivid, 6-10 sentences. Highlight key moments.",
        "",
        "## Match",
        f"  Title  : {m.titre}",
        f"  Type   : {m.type or '—'}",
        f"  Teams  : {m.equipe1}  vs  {m.equipe2}",
        f"  Score  : {score}",
        f"  Status : {m.statut or '—'}",
        "",
        "## Match events (chronological)",
        events_text,
        "",
        "Write ONLY the narrative. No titles, no markdown.",
    ])


@app.post("/match-summary", response_model=SummaryResponse)
async def match_summary(req: SummaryRequest):
    t0 = time.time()
    prompt = _build_summary_prompt(req)
    text, from_llm = await _call_gemini(prompt)
    latency = int((time.time() - t0) * 1000)
    return SummaryResponse(summary=text, from_llm=from_llm, latency_ms=latency)
