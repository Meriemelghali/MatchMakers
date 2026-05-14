import os
import time
import asyncio
from typing import Optional, List, Dict, Any

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json


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


@app.post("/leaderboard", response_model=LeaderboardResponse)
async def leaderboard(req: LeaderboardRequest):
    t0 = time.time()
    prompt = _build_prompt(req)

    # Preferred: OpenRouter (cloud) via OpenAI SDK (OpenAI-compatible).
    if OPENROUTER_API_KEY:
        try:
            from openai import OpenAI

            model = (req.model or OPENROUTER_MODEL).strip() if (req.model or OPENROUTER_MODEL) else OPENROUTER_MODEL
            client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)

            extra_headers = {}
            if OPENROUTER_SITE_URL:
                extra_headers["HTTP-Referer"] = OPENROUTER_SITE_URL
            if OPENROUTER_APP_NAME:
                extra_headers["X-OpenRouter-Title"] = OPENROUTER_APP_NAME

            def _call():
                return client.chat.completions.create(
                    model=model,
                    extra_headers=extra_headers or None,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": prompt},
                    ],
                )

            resp = await asyncio.to_thread(_call)
            text = (resp.choices[0].message.content or "").strip() if resp.choices else ""
            if text:
                return LeaderboardResponse(
                    answer=text,
                    from_llm=True,
                    model=model,
                    latency_ms=int((time.time() - t0) * 1000),
                )
        except Exception as e:
            # Fall back to Ollama if available, otherwise return a helpful hint below.
            print(f"[openrouter] error: {type(e).__name__}: {e}")
            pass

    # Fallback: Ollama OpenAI-compatible API: POST /v1/chat/completions
    try:
        model = (req.model or OLLAMA_MODEL).strip() if (req.model or OLLAMA_MODEL) else OLLAMA_MODEL
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


@app.post("/similar", response_model=List[ScoredProduct])
def similar(req: SimilarRequest):
    """
    Retourne les produits les plus similaires au produit cible.
    Appelé par Spring → page détail produit.
    """
    scored = _compute_similar(req.targetProduct, req.candidates)
    return scored[:req.topK]

 # ───── SPONSOR AI ENDPOINTS ─────

class SponsorDescReq(BaseModel):
    campaignName: str
    targetSport: Optional[str] = None
    targetAudience: Optional[str] = None

class SponsorMatchReq(BaseModel):
    sponsorName: str
    sponsorDescription: str
    eventName: str
    eventSport: str

class SponsorAnalyzeReq(BaseModel):
    campaigns: List[dict]  # list of {title, views, clicks, budget}

class SponsorSuggestReq(BaseModel):
    eventDescription: str
    eventSport: str
    sponsors: List[dict] # list of {id, name, description, sport}

async def _call_llm(prompt: str) -> str:
    # helper for OpenRouter then Ollama
    if OPENROUTER_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)
            resp = await asyncio.to_thread(lambda: client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=[{"role": "user", "content": prompt}]
            ))
            return resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenRouter Error: {e}")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{OLLAMA_URL.rstrip('/')}/v1/chat/completions",
                json={"model": OLLAMA_MODEL, "messages": [{"role": "user", "content": prompt}], "stream": False},
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"Ollama Error: {e}")
        return ""


@app.post("/api/sponsor-ai/generate-description")
async def generate_sponsor_description(req: SponsorDescReq):
    sport = req.targetSport or "tous sports"
    prompt = f"Rédige une description marketing très accrocheuse (2 phrases max) pour une campagne publicitaire nommée '{req.campaignName}' ciblant le public '{sport}'."
    res = await _call_llm(prompt)
    if not res: res = f"Découvrez notre nouvelle campagne {req.campaignName} spécialement conçue pour les passionnés de {sport} !"
    return {"description": res}

@app.post("/api/sponsor-ai/match-score")
async def match_score(req: SponsorMatchReq):
    prompt = f"""
    Sponsor : {req.sponsorName} ({req.sponsorDescription})
    Événement : {req.eventName} ({req.eventSport})
    Donne UNIQUEMENT un score de pertinence entre 0 et 100 pour ce partenariat. Réponds juste par le nombre, rien d'autre.
    """
    res = await _call_llm(prompt)
    score = 50
    try:
        import re
        nums = re.findall(r'\d+', res)
        if nums: score = min(100, int(nums[0]))
    except: pass
    return {"score": score}

@app.post("/api/sponsor-ai/analyze")
async def analyze_campaigns(req: SponsorAnalyzeReq):
    stats = "\n".join([f"- {c.get('campaignName', 'Campagne')}: Vues={c.get('views',0)}, Clics={c.get('clicks',0)}" for c in req.campaigns])
    prompt = f"En tant qu'expert marketing, analyse brièvement ces campagnes et donne 2 recommandations fortes (sans blabla) :\n{stats}"
    res = await _call_llm(prompt)
    if not res: res = "1. Augmentez le budget des campagnes avec le meilleur CTR.\n2. Revoyez les visuels des campagnes ayant beaucoup de vues mais peu de clics."
    return {"analysis": res}

@app.post("/api/sponsor-ai/suggest")
async def suggest_sponsors(req: SponsorSuggestReq):
    sponsors_str = "\n".join([f"- {s.get('companyName')} ({s.get('targetSport', 'Général')}): {s.get('description', '')}" for s in req.sponsors])
    prompt = f"""
    Événement : {req.eventDescription} ({req.eventSport})
    Sponsors disponibles :
    {sponsors_str}
    Suggère les 2 meilleurs sponsors pour cet événement et explique très brièvement pourquoi.
    """
    res = await _call_llm(prompt)
    if not res: res = "Nous suggérons les sponsors ciblant le même sport que votre événement."
    return {"suggestion": res}
