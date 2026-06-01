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
import html as html_module
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

GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL_ENV  = os.getenv("GEMINI_MODEL", "")   # optional override
GOOGLE_TTS_KEY    = os.getenv("GOOGLE_TTS_API_KEY", "")

_GOOGLE_TTS_URL   = "https://texttospeech.googleapis.com/v1/text:synthesize"

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

def _to_ssml(text: str, event_type: str) -> str:
    """
    Build SSML for natural-sounding sports commentary.

    Design rules:
    - audioConfig pitch=0 and rate=1.0 (neutral) — NO stacking
    - SSML pitch stays within ±3st  (beyond that = unnatural)
    - SSML rate stays within 0.85–1.15  (beyond that = robotic)
    - Breaks are short (100–180ms) — long breaks sound like loading lag
    - One voice for everything — consistency matters more than variety
    """
    safe = html_module.escape(text)

    if event_type == "BUT":
        # Pattern: slow + raised "But !" → short breath → faster energetic rest
        m = re.search(r'(But\s*!)', safe, re.IGNORECASE)
        if m:
            opener = m.group(1)
            rest   = safe[m.end():].strip()
            body   = (
                f'<prosody rate="0.84" pitch="+2.5st">{opener}</prosody>'
                f'<break time="160ms"/>'
                + (f'<prosody rate="1.1" pitch="+1st">{rest}</prosody>' if rest else '')
            )
        else:
            body = f'<prosody rate="1.05" pitch="+2st">{safe}</prosody>'
        return f'<speak>{body}</speak>'

    elif event_type == "PENALTY":
        m = re.search(r'(Penalty\s*[^!]*!\s*)', safe, re.IGNORECASE)
        if m:
            opener = m.group(1)
            rest   = safe[m.end():].strip()
            body   = (
                f'<prosody rate="0.88" pitch="+2st">{opener}</prosody>'
                f'<break time="130ms"/>'
                + (f'<prosody rate="1.08" pitch="+1st">{rest}</prosody>' if rest else '')
            )
        else:
            body = f'<prosody rate="1.0" pitch="+1.5st">{safe}</prosody>'
        return f'<speak>{body}</speak>'

    elif event_type == "ARRET":
        # Stunned exclamation then admiration
        m = re.search(r'([^!]+!)', safe)
        if m:
            opener = m.group(1)
            rest   = safe[m.end():].strip()
            body   = (
                f'<emphasis level="strong"><prosody pitch="+2st">{opener}</prosody></emphasis>'
                f'<break time="120ms"/>'
                + (f'<prosody rate="1.05">{rest}</prosody>' if rest else '')
            )
        else:
            body = f'<prosody pitch="+1.5st">{safe}</prosody>'
        return f'<speak>{body}</speak>'

    elif event_type == "CARTON_ROUGE":
        # Slow and grave — like a judge, not a robot
        return f'<speak><prosody rate="0.92" pitch="-1.5st">{safe}</prosody></speak>'

    elif event_type == "CARTON_JAUNE":
        return f'<speak><prosody rate="0.97" pitch="+0.5st">{safe}</prosody></speak>'

    elif event_type == "DEBUT_MI_TEMPS":
        return f'<speak><prosody rate="1.05" pitch="+1st">{safe}</prosody></speak>'

    elif event_type == "FIN_MI_TEMPS":
        return f'<speak><prosody rate="0.96" pitch="-0.5st">{safe}</prosody></speak>'

    elif event_type == "REMPLACEMENT":
        return f'<speak><prosody rate="0.97" pitch="-0.5st">{safe}</prosody></speak>'

    else:
        return f'<speak>{safe}</speak>'


async def _google_tts(text: str, event_type: str = "default") -> Optional[str]:
    """
    Call Google Cloud TTS Neural2 with per-event prosody profiles.
    Voice: fr-FR-Neural2-B (goals/saves) or fr-FR-Neural2-D (cards/calm events).
    Returns base64-encoded MP3 or None on error.
    """
    if not GOOGLE_TTS_KEY:
        return None

    volume = _TTS_VOLUME.get(event_type, _TTS_VOLUME["default"])
    ssml   = _to_ssml(text, event_type)

    payload = {
        "input": {"ssml": ssml},
        "voice": {
            "languageCode": "fr-FR",
            "name":         "fr-FR-Neural2-B",  # single consistent voice
        },
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate":  1.0,   # neutral — SSML handles all rate variation
            "pitch":         0.0,   # neutral — SSML handles all pitch variation
            "volumeGainDb":  volume,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                _GOOGLE_TTS_URL,
                json=payload,
                params={"key": GOOGLE_TTS_KEY},
            )
            r.raise_for_status()
            return r.json().get("audioContent")   # already base64 from Google
    except Exception as exc:
        print(f"[GeminiAI] Google TTS error: {exc}")
        return None


@app.get("/health")
def health():
    return {
        "ok":                 True,
        "active_version":     _active_version,
        "models_available":   _discovered_models,
        "api_key_configured": bool(GEMINI_API_KEY),
        "tts_available":      bool(GOOGLE_TTS_KEY),
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
                "teamName": str(item.get("teamName") or ""),
                "score":    max(0, min(100, int(item.get("score", 50)))),
                "reason":   str(item.get("reason") or ""),
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


# ---------------------------------------------------------------------------
# /voice-commentary
# ---------------------------------------------------------------------------

_FALLBACKS: dict[str, str] = {
    "BUT":            "But ! Le ballon explose les filets ! Quel moment de folie pure !",
    "PENALTY":        "Penalty transformé ! Sang-froid de champion ! Le gardien n'a rien pu faire !",
    "CARTON_JAUNE":   "Carton jaune ! L'arbitre sort le carton, la pression monte d'un cran !",
    "CARTON_ROUGE":   "Carton rouge ! Expulsion ! Le match bascule complètement à cet instant !",
    "REMPLACEMENT":   "Remplacement. Le coach ajuste son dispositif tactique.",
    "ARRET":          "Arrêt miraculeux ! Le gardien vole sur sa ligne ! Comment a-t-il sorti ça ?",
    "HORS_JEU":       "Hors-jeu ! Le drapeau se lève, le but est refusé. La frustration est totale.",
    "DEBUT_MI_TEMPS": "Le coup de sifflet de l'arbitre retentit ! Le match est lancé !",
    "FIN_MI_TEMPS":   "Mi-temps ! Les joueurs soufflent. Bilan à faire dans les vestiaires.",
}

# Only volume varies per event — pitch and rate are handled exclusively by SSML
# (avoids the compounding/stacking problem when both audioConfig and SSML set rate/pitch)
_TTS_VOLUME: dict[str, float] = {
    "BUT":            3.5,
    "PENALTY":        3.0,
    "ARRET":          3.0,
    "CARTON_ROUGE":   2.0,
    "CARTON_JAUNE":   1.5,
    "DEBUT_MI_TEMPS": 2.0,
    "FIN_MI_TEMPS":   1.0,
    "REMPLACEMENT":   0.5,
    "HORS_JEU":       1.0,
    "default":        1.5,
}

_STYLE_EXAMPLES: dict[str, list[str]] = {
    "BUT": [
        "But de {player} ! Quelle frappe de génie ! Le stade est en feu !",
        "Il a marqué ! {player} envoie le ballon en pleine lucarne ! C'est une œuvre d'art !",
        "C'est dedans ! {player} porte {team} vers la gloire ! {score} !",
        "But à la {minute}ème minute ! {player} surgit de nulle part et pulvérise le gardien !",
    ],
    "PENALTY": [
        "Penalty transformé ! {player} prend son élan, il frappe, dans les filets ! Sang-froid absolu !",
        "Il ne tremble pas ! {player} envoie le penalty dans un angle impossible ! Imparable !",
    ],
    "CARTON_ROUGE": [
        "Carton rouge ! L'arbitre est formel ! {player} est exclu ! Le match bascule à la {minute}ème !",
        "Rouge direct ! {player} prend la sortie ! {team} se retrouve à dix ! Quelle situation !",
    ],
    "ARRET": [
        "Arrêt miraculeux ! Le gardien vole sur sa ligne ! Comment a-t-il sorti ça ? C'est de l'autre monde !",
        "Réflexe incroyable ! Sauvé sur la ligne ! Le gardien est l'homme du match !",
    ],
    "CARTON_JAUNE": [
        "Carton jaune pour {player} ! L'arbitre sévit ! Attention, un deuxième serait fatal !",
    ],
}


class VoiceCommentaryRequest(BaseModel):
    event_type:  str
    minute:      Optional[int]  = None
    player:      Optional[str]  = None
    team_name:   Optional[str]  = None
    score_team1: Optional[int]  = None
    score_team2: Optional[int]  = None
    match_team1: Optional[str]  = None
    match_team2: Optional[str]  = None


class VoiceCommentaryResponse(BaseModel):
    commentary:      str
    from_llm:        bool
    audio_base64:    Optional[str] = None
    audio_available: bool          = False


def _score_context(req: VoiceCommentaryRequest) -> str:
    """Return a dramatic score-context hint for the prompt."""
    if req.score_team1 is None or req.score_team2 is None:
        return ""
    s1, s2 = req.score_team1, req.score_team2
    if req.event_type == "BUT":
        if s1 == s2:
            return f"score {s1}-{s2} — ÉGALISATION ! tension maximale"
        lead = req.match_team1 if s1 > s2 else req.match_team2
        diff = abs(s1 - s2)
        if diff == 1:
            return f"score {s1}-{s2} — {lead} prend l'avantage d'un but"
        return f"score {s1}-{s2} — {lead} creuse l'écart"
    return f"score actuel {s1}-{s2}"


def _build_voice_commentary_prompt(req: VoiceCommentaryRequest) -> str:
    minute       = f"{req.minute}" if req.minute is not None else "?"
    score_ctx    = _score_context(req)
    examples     = _STYLE_EXAMPLES.get(req.event_type, [])
    filled       = []
    for ex in examples[:2]:
        filled.append(
            ex.replace("{player}", req.player or "le joueur")
               .replace("{team}",   req.team_name or "l'équipe")
               .replace("{minute}", minute)
               .replace("{score}",  score_ctx)
        )

    lines = [
        "Tu es le meilleur commentateur sportif de l'histoire, style beIN Sports / Canal+ Champions League.",
        "MISSION : générer le commentaire en direct le plus ÉLECTRISANT possible pour cet événement.",
        "",
        "RÈGLES ABSOLUES :",
        "  • 1 à 3 phrases maximum",
        "  • Langue : français, registre télévisuel premium",
        "  • Pour les buts : commence par 'But !' — simple, net, percutant (la voix TTS gère le drama)",
        "  • N'étire JAMAIS les mots avec des lettres répétées (pas de 'Buuuut', 'Goooal', etc.) — le TTS ne sait pas les prononcer",
        "  • Utilise des mots forts et expressifs plutôt que des lettres répétées",
        "  • Intègre le contexte du score pour le drame (égalisation, but victorieux, retour au score)",
        "  • Varie les formules — ne répète jamais la même structure",
        "  • ZÉRO ponctuation markdown, guillemets ou tirets — uniquement texte brut",
        "  • Uniquement le commentaire, rien d'autre",
        "",
        f"ÉVÉNEMENT : {req.event_type}",
        f"MINUTE    : {minute}'",
    ]
    if req.player:
        lines.append(f"JOUEUR    : {req.player}")
    if req.team_name:
        lines.append(f"ÉQUIPE    : {req.team_name}")
    if req.match_team1 and req.match_team2:
        lines.append(f"MATCH     : {req.match_team1} vs {req.match_team2}")
    if score_ctx:
        lines.append(f"SCORE     : {score_ctx}")
    if filled:
        lines.append("")
        lines.append("EXEMPLES DU STYLE ATTENDU (inspire-toi, ne copie pas) :")
        for ex in filled:
            lines.append(f"  → {ex}")

    return "\n".join(lines)


_HIGH_ENERGY = {"BUT", "PENALTY", "ARRET", "CARTON_ROUGE"}


@app.post("/voice-commentary", response_model=VoiceCommentaryResponse)
async def voice_commentary(req: VoiceCommentaryRequest):
    prompt = _build_voice_commentary_prompt(req)
    text, from_llm = await _call_gemini(prompt)

    if not from_llm or not text.strip():
        text = _FALLBACKS.get(req.event_type, f"Action à la {req.minute}ème minute !")
        from_llm = False

    # Clean up markdown artifacts
    text = re.sub(r"[*_`#\"\']", "", text).strip()
    # Collapse any repeated letters (Buuuuut → But, Goooal → Goal, etc.)
    text = re.sub(r'([a-zA-ZÀ-ÿ])\1{2,}', r'\1\1', text)

    # For calm events keep only the first sentence; high-energy events keep up to 3
    max_sentences = 3 if req.event_type in _HIGH_ENERGY else 1
    sentences, count = [], 0
    buf = ""
    for ch in text:
        buf += ch
        if ch in ("!", "?", "."):
            count += 1
            sentences.append(buf.strip())
            buf = ""
            if count >= max_sentences:
                break
    if buf.strip():
        sentences.append(buf.strip())
    text = " ".join(sentences) if sentences else text

    # Generate high-quality audio with the right profile for this event
    audio_b64 = await _google_tts(text, req.event_type)

    return VoiceCommentaryResponse(
        commentary=text,
        from_llm=from_llm,
        audio_base64=audio_b64,
        audio_available=audio_b64 is not None,
    )


# ---------------------------------------------------------------------------
# /sport-quote
# ---------------------------------------------------------------------------

class QuoteRequest(BaseModel):
    sports: list[str]


class QuoteResponse(BaseModel):
    quote:      str
    from_llm:   bool
    latency_ms: int


@app.post("/sport-quote", response_model=QuoteResponse)
async def sport_quote(req: QuoteRequest):
    t0 = time.time()
    sports_str = ", ".join(req.sports) if req.sports else "sports en général"
    prompt = (
        f"Tu es un motivateur sportif pour la plateforme MatchMakers. "
        f"L'utilisateur est fan de : {sports_str}. "
        f"Donne une citation inspirante courte ou une info fascinante sur ces sports en français. "
        f"Sois engageant et positif. Max 2 phrases. Pas de titres, pas de markdown."
    )
    text, from_llm = await _call_gemini(prompt)
    latency = int((time.time() - t0) * 1000)
    return QuoteResponse(quote=text, from_llm=from_llm, latency_ms=latency)


# ---------------------------------------------------------------------------
# /reclamation-analyze
# ---------------------------------------------------------------------------

class ReclamationRequest(BaseModel):
    description: str


class ReclamationAnalysisResponse(BaseModel):
    type:         str
    urgence:      str
    reponse_auto: str
    from_llm:     bool
    latency_ms:   int


def _build_reclamation_prompt(description: str) -> str:
    return "\n".join([
        "Tu es l'assistant de support de MatchMakers. Analyse la réclamation suivante.",
        f"Réclamation : \"{description}\"",
        "",
        "Détermine :",
        "1. Le type exact parmi : COMPORTEMENT, PAIEMENT, TECHNIQUE.",
        "2. L'urgence parmi : HAUTE, MOYENNE, BASSE. (HAUTE si insultes, agression verbale, violence).",
        "3. Rédige une réponse automatique polie (1-2 phrases) pour le joueur rassurant que la demande est en cours.",
        "",
        "Réponds STRICTEMENT en JSON avec ce format exact :",
        "{",
        '  "type": "...",',
        '  "urgence": "...",',
        '  "reponse_auto": "..."',
        "}"
    ])


@app.post("/reclamation-analyze", response_model=ReclamationAnalysisResponse)
async def reclamation_analyze(req: ReclamationRequest):
    t0 = time.time()
    prompt = _build_reclamation_prompt(req.description)
    text, from_llm = await _call_gemini(prompt)
    latency = int((time.time() - t0) * 1000)

    clean_text = text.replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(clean_text)
        r_type = data.get("type", "TECHNIQUE").upper()
        if r_type not in ["COMPORTEMENT", "PAIEMENT", "TECHNIQUE"]:
            r_type = "TECHNIQUE"
        urgence = data.get("urgence", "MOYENNE").upper()
        if urgence not in ["HAUTE", "MOYENNE", "BASSE"]:
            urgence = "MOYENNE"
        reponse_auto = data.get("reponse_auto", "Votre demande est en cours de traitement.")
    except Exception:
        r_type       = "TECHNIQUE"
        urgence      = "MOYENNE"
        reponse_auto = "Votre demande a bien été reçue. Nous la traitons dans les plus brefs délais."

    return ReclamationAnalysisResponse(
        type=r_type,
        urgence=urgence,
        reponse_auto=reponse_auto,
        from_llm=from_llm,
        latency_ms=latency,
    )
