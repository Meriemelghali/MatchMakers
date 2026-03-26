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


