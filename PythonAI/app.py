import os
import time
from typing import Optional

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


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


app = FastAPI(title="MatchMakers Python AI (Ollama)", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "ollama_url": OLLAMA_URL, "default_model": OLLAMA_MODEL}


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

class ProductChatRequest(BaseModel):
    question: str = Field(min_length=1)
    products_context: Optional[str] = None  # liste des produits en JSON
    model: Optional[str] = None

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


@app.post("/similar", response_model=List[ScoredProduct])
def similar(req: SimilarRequest):
    """
    Retourne les produits les plus similaires au produit cible.
    Appelé par Spring → page détail produit.
    """
    scored = _compute_similar(req.targetProduct, req.candidates)
    return scored[:req.topK]