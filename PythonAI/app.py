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


