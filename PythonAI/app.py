import os
import time
from typing import Optional

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


# Toxicity Detection Models
class ToxicityRequest(BaseModel):
    text: str

class ToxicityResponse(BaseModel):
    is_toxic: bool
    scores: dict
    verdict: str


class RecommendationRequest(BaseModel):
    date_heure: str
    terrains: list


class RecommendationResponse(BaseModel):
    recommandations: list


class EvaluationRequest(BaseModel):
    date_heure: str
    terrain: dict


class EvaluationResponse(BaseModel):
    score: float
    verdict: str
    raisons: list
    details: dict


class BestSlotsRequest(BaseModel):
    base_date: str # YYYY-MM-DD
    terrain: dict


class BestSlotsResponse(BaseModel):
    slots: list # List of {date_heure, score, raisons}


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
        "ollama_url": OLLAMA_URL, 
        "default_model": OLLAMA_MODEL,
        "toxicity_model": TOXICITY_MODEL_NAME if toxicity_model else "not_loaded"
    }


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

    # Ollama OpenAI-compatible API: POST /v1/chat/completions
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

    # Fallback: keep UI usable even if Ollama isn't installed/running.
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


# --- Toxicity Detection Endpoint ---

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
        # Wrap in a list for predict
        results = toxicity_model.predict([request.text])
        # predict returns a dict of lists
        scores = {k: float(v[0]) for k, v in results.items()}
        
        global_score = max(scores.values())
        is_toxic = global_score >= TOXICITY_THRESHOLD
        verdict = get_verdict(scores, TOXICITY_THRESHOLD)

        return ToxicityResponse(
            is_toxic=is_toxic,
            scores=scores,
            verdict=verdict
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Recommendation Endpoint ---

@app.post("/recommend", response_model=RecommendationResponse)
async def recommend_terrains(req: RecommendationRequest):
    try:
        recommandations = []
        for t in req.terrains:
            result = calculate_final_score(t, req.date_heure)
            recommandations.append({
                "terrain_id": t.get('id', t.get('_id')),
                "score": result['score'],
                "raisons": result['raisons'],
                "details": result['details']
            })
            
        recommandations.sort(key=lambda x: x['score'], reverse=True)
        return {"recommandations": recommandations}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
