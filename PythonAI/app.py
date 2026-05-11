import os
import time
from typing import Optional, List

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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
    }


# ─────────────────────────────────────────────────────────────────────────────
# LLM Leaderboard Endpoint
# ─────────────────────────────────────────────────────────────────────────────

def _build_prompt(req: LeaderboardRequest) -> str:
    parts = []
    parts.append("Tu es un assistant pour l'ecran 'Classement' de MatchMakers.")
    parts.append("Reponds en francais, en 6-10 lignes max, concret et actionnable.")
    parts.append("Si une info manque, dis-le clairement et propose une alternative.")
    if req.context and req.context.strip():
        parts.append("")
        parts.append("CONTEXTE (snapshot):")
        parts.append(req.context.strip())
    parts.append("")
    parts.append("QUESTION:")
    parts.append(req.question.strip())
    return "\n".join(parts)


@app.post("/leaderboard", response_model=LeaderboardResponse)
async def leaderboard(req: LeaderboardRequest):
    t0 = time.time()
    model = (req.model or OLLAMA_MODEL).strip() if (req.model or OLLAMA_MODEL) else OLLAMA_MODEL
    prompt = _build_prompt(req)

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
            if text:
                return LeaderboardResponse(
                    answer=text,
                    from_llm=True,
                    model=model,
                    latency_ms=int((time.time() - t0) * 1000),
                )
    except Exception:
        pass

    hint = (
        "IA (gratuit): Ollama n'est pas accessible.\n"
        "1) Installe Ollama\n"
        "2) Lance: `ollama serve`\n"
        f"3) Telecharge un modele: `ollama pull {model}`\n"
        "Ensuite reessaie."
    )
    return LeaderboardResponse(
        answer=hint,
        from_llm=False,
        model=model,
        latency_ms=int((time.time() - t0) * 1000),
    )


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
