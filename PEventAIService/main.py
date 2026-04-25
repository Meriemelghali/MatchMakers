import os
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv
import google.generativeai as genai
import json
import random

# Load environment variables
load_dotenv()

# Initialize Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
app = FastAPI(title="EventType AI Service", description="AI microservice for Event Type suggestions", version="1.0.0")

class SuggestionRequest(BaseModel):
    typeName: str

class EventTypeInput(BaseModel):
    id: Optional[int]
    typeName: str
    description: Optional[str]
    isCompetition: Optional[bool]
    requiresTeams: Optional[bool]
    requiresMatches: Optional[bool]
    icon: Optional[str]

class InnovationRequest(BaseModel):
    currentType: EventTypeInput

class SuggestConfigurationRequest(BaseModel):
    sport: str
    isCompetition: bool

class NamesRequest(BaseModel):
    sport: str
    type: str

class DescriptionRequest(BaseModel):
    sport: str
    type: str

class ContextAnalysisRequest(BaseModel):
    sport: str
    eventType: str

class MatchHistoryItem(BaseModel):
    team1: str
    team2: str
    score1: int
    score2: int
    date: Optional[str] = None

class PredictionRequest(BaseModel):
    team1: str
    team2: str
    history: List[MatchHistoryItem]

class EventPredictionRequest(BaseModel):
    sport: str
    eventType: str
    participants: List[str]

class QuoteRequest(BaseModel):
    sports: List[str]

# Fallback values if API key is not present or fails
def get_fallback_suggestion(type_name: str) -> dict:
    name = type_name.lower()
    description = "Format d'événement standard optimisé pour l'engagement."
    icon = "✨"
    
    if "tournoi" in name or "tournament" in name:
        description = "Format à élimination directe pour désigner un vainqueur final."
        icon = "🏆"
    elif "match" in name or "amical" in name or "friendly" in name:
        description = "Rencontre amicale ou challenge direct entre participants."
        icon = "🤝"
    elif "session" in name or "entraînement" in name or "training" in name:
        description = "Session d'entraînement ciblée sur le développement des compétences."
        icon = "🏃"
    elif "gala" in name or "show" in name:
        description = "Événement de prestige alliant sport et divertissement."
        icon = "🎭"

    return {
        "typeName": type_name,
        "icon": icon,
        "description": description,
        "isCompetition": "tournoi" in name or "tournament" in name or "cup" in name or "league" in name,
        "requiresTeams": "indiv" not in name and "solo" not in name,
        "requiresMatches": True
    }

@app.post("/api/ai/suggest-type-config")
async def suggest_type_config(request: SuggestionRequest):
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY is missing. Using fallback.")
        return get_fallback_suggestion(request.typeName)
        
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        You are an AI assistant for a sports matchmaking platform called MatchMakers.
        A user wants to create a new event type called: "{request.typeName}".
        Suggest a configuration for this event type. Respond ONLY with valid JSON, nothing else.
        Structure:
        {{
            "typeName": "{request.typeName}",
            "icon": "A single relevant emoji",
            "description": "A very attractive, professional description of this event type in French.",
            "isCompetition": true/false (true if it's competitive like a tournament),
            "requiresTeams": true/false (true if usually played in teams),
            "requiresMatches": true/false (true if it requires generating a schedule of matches)
        }}
        """
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Robustly extract JSON from potential markdown code blocks
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(text)
        return data
    except Exception as e:
        print(f"Error suggesting type config for '{request.typeName}': {str(e)}")
        return get_fallback_suggestion(request.typeName)

@app.post("/api/ai/innovate-type-config")
async def innovate_type_config(request: InnovationRequest):
    if not GEMINI_API_KEY:
        desc = request.currentType.description or ""
        return {
            "id": request.currentType.id,
            "typeName": request.currentType.typeName,
            "description": f"Évolution 'Elite' ✨ : {desc} - Ce format a été optimisé pour l'immersion.",
            "defaultRules": [
                "Points d'expérience doublés sur les 5 dernières minutes",
                "Bonus Fair-play",
                "MVP interactif"
            ]
        }
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        You are an AI assistant for a sports matchmaking platform called MatchMakers.
        Innovate an existing event type to make it more 'Elite', modern, and engaging.
        Current Type: {request.currentType.typeName}
        Current Description: {request.currentType.description if request.currentType.description else 'None'}
        
        Respond ONLY with a valid JSON.
        Structure:
        {{
            "id": {request.currentType.id if request.currentType.id is not None else "null"},
            "typeName": "{request.currentType.typeName}",
            "description": "An evolved, elite description in French for this event type.",
            "defaultRules": [
                "3 creative, modern rules for this event type in French."
            ]
        }}
        """
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(text)
        return data
    except Exception as e:
        print(f"Error calling Gemini for innovation on '{request.currentType.typeName}': {str(e)}")
        desc = request.currentType.description or ""
        return {
            "id": request.currentType.id,
            "typeName": request.currentType.typeName,
            "description": f"Évolution 'Elite' ✨ : {desc} - Ce format a été optimisé pour l'immersion.",
            "defaultRules": ["Points mystères", "Bonus d'équipe", "Vote MVP communautaire"]
        }

@app.post("/api/ai/suggest-names")
async def suggest_names(request: NamesRequest):
    # Base suggestions from sport and type names
    base_names = [
        f"{request.sport} {request.type}",
        f"Challenge {request.sport}",
        f"Masters {request.sport} {request.type}"
    ]
    
    if not GEMINI_API_KEY:
        return base_names
        
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Give me 3 creative, catchy and professional names for a sports event.
        Sport: {request.sport}
        Type: {request.type}
        Language: French
        Structure: Respond ONLY with a JSON array of 3 strings.
        """
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        return json.loads(text)
    except Exception as e:
        print(f"Error suggesting names for {request.sport}/{request.type}: {str(e)}")
        # Improve fallback for names too
        return [
            f"{request.sport} {request.type} Elite",
            f"MatchMakers {request.sport} Trophy",
            f"The {request.sport} Classic"
        ]

@app.post("/api/ai/suggest-description")
async def suggest_description(request: DescriptionRequest):
    if not GEMINI_API_KEY:
        return f"Plongez dans l'intensité du {request.sport} avec cet événement de type {request.type}. Ouvert à tous les passionnés !"
        
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Write a professional and compelling description for a sports event.
        Sport: {request.sport}
        Type: {request.type}
        Language: French
        Context: For a premium sports matchmaking app called MatchMakers.
        Length: 2-3 sentences.
        Structure: Respond with ONLY the description text.
        """
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error suggesting description for {request.sport}/{request.type}: {str(e)}")
        return f"Rejoignez-nous pour un événement exceptionnel de {request.sport} ({request.type}). Esprit sportif et convivialité au rendez-vous !"

@app.post("/api/ai/analyze-context")
async def analyze_context(request: ContextAnalysisRequest):
    if not GEMINI_API_KEY:
        return {
            "advice": f"Configurez votre événement de {request.sport} selon vos préférences.",
            "requiresTerrain": True,
            "requiresSpecialRoute": False
        }
        
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        You are an AI assistant for a sports matchmaking platform called MatchMakers.
        The user is creating an event for Sport: "{request.sport}" and Event Type: "{request.eventType}".
        Analyze this combination and provide a brief, helpful practical advice (1-2 sentences) about the location or infrastructure needed. 
        For example, if the sport is Cycling or Running, you should note that it might require a specific route or track rather than a traditional field/terrain.
        Also determine if this sport typically requires a standard playing field/terrain ('requiresTerrain') or a special route/track ('requiresSpecialRoute').
        Language: French
        Respond ONLY with valid JSON.
        Structure:
        {{
            "advice": "A brief, practical advice in French regarding the infrastructure/location.",
            "requiresTerrain": true/false,
            "requiresSpecialRoute": true/false
        }}
        """
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(text)
        return data
    except Exception as e:
        print(f"Error analyzing context for {request.sport}/{request.eventType}: {str(e)}")
        route_sports = {"cycling", "running", "athletics", "swimming", "triathlon"}
        is_route = request.sport.lower() in route_sports
        return {
            "advice": (
                f"Le {request.sport} nécessite un parcours ou une piste spécifique plutôt qu'un terrain classique. Précisez le lieu du parcours."
                if is_route else
                f"Pensez à bien définir le lieu pour votre événement de {request.sport}."
            ),
            "requiresTerrain": not is_route,
            "requiresSpecialRoute": is_route
        }

@app.post("/api/ai/predict-match")
async def predict_match(request: PredictionRequest):
    if not GEMINI_API_KEY:
        return {
            "predictedScore": "1-1",
            "winProbability": 50,
            "analysis": "IA indisponible. Simulation de base basée sur l'équilibre."
        }
        
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Format history for the prompt
        history_text = "\n".join([
            f"- {m.date or ''}: {m.team1} {m.score1} - {m.score2} {m.team2}" 
            for m in request.history
        ])
        
        prompt = f"""
        You are an expert sports analyst for MatchMakers.
        Predict the outcome of a match between {request.team1} and {request.team2}.
        
        RECENT HISTORY (last matches of both teams):
        {history_text}
        
        Provide a detailed analysis in French, considering the recent form.
        Respond ONLY with a valid JSON.
        Structure:
        {{
            "predictedScore": "e.g., 2-1",
            "winProbability": 65 (percentage chance for {request.team1} to win or draw favorably),
            "analysis": "A professional analysis in French (3-4 sentences) explaining the prediction based on history."
        }}
        """
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        return json.loads(text)
    except Exception as e:
        print(f"Error predicting match {request.team1} vs {request.team2}: {str(e)}")
        return {
            "predictedScore": "?-?",
            "winProbability": 50,
            "analysis": "Erreur lors de l'analyse IA. Les statistiques n'ont pas pu être traitées."
        }

@app.post("/api/ai/predict-event-outcome")
async def predict_event_outcome(request: EventPredictionRequest):
    if not GEMINI_API_KEY:
        return {
            "winner": request.participants[0] if request.participants else "Inconnu",
            "confidence": 70,
            "analysis": "IA indisponible. Simulation basée sur l'ordre de sélection."
        }
        
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        participants_text = ", ".join(request.participants)
        
        prompt = f"""
        You are an expert sports analyst for MatchMakers.
        Task: Predict the outcome of a {request.eventType} for the sport: {request.sport}.
        Participants: {participants_text}
        
        Is this sport a "Match" (1v1, team vs team) or a "Race/Ranking" (multi-competitors individual/timed)?
        
        If it is a RACE (like Cycling, Running, Swimming):
        Analyze and provide the predicted PODIUM (1st and 2nd minimum).
        Respond with:
        {{
            "isRace": true,
            "ranking": ["1. Name", "2. Name"],
            "confidence": 80,
            "analysis": "Analysis in French explaining the ranking logic."
        }}
        
        If it is a MATCH (like Football, Basketball, Tennis):
        Respond with:
        {{
            "isRace": false,
            "winner": "Favorite team name",
            "confidence": 75,
            "analysis": "Analysis in French explaining the favorite's advantage."
        }}
        
        Respond ONLY with a valid JSON.
        """
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        return json.loads(text)
    except Exception as e:
        print(f"Error predicting event outcome: {str(e)}")
        return {
            "winner": "Analyse en cours",
            "confidence": 50,
            "analysis": "L'analyse prédictive pour cet ensemble de participants est temporairement indisponible."
        }

@app.post("/api/ai/sport-quote")
async def sport_quote(request: QuoteRequest):
    if not GEMINI_API_KEY:
        return {
            "quote": "Le sport est le dépassement de soi. Restez passionné !",
            "from_llm": False
        }
        
    try:
        import random
        # Switch to gemini-1.5-flash for better stability/quota
        model = genai.GenerativeModel('gemini-1.5-flash')
        sports_str = ", ".join(request.sports) if request.sports else "sports en général"
        
        prompt = f"""
        Tu es un expert en culture sportive pour la plateforme MatchMakers.
        L'utilisateur est fan de : {sports_str}.
        
        Ta mission : Donne soit un "Fun Fact" sportif fascinant (anecdote incroyable, record insolite, comparaison physique impressionnante), soit une citation motivante.
        Exemple de Fun Fact : "Savais-tu que Cristiano Ronaldo saute plus haut qu'un joueur NBA moyen ?"
        
        Règles :
        - Langue : Français
        - Style : Captivant, éducatif et court
        - Longueur : Max 2 phrases
        - Pas de titres, pas de markdown, commence direct par le texte.
        """
        
        response = model.generate_content(prompt)
        return {
            "quote": response.text.strip(),
            "from_llm": True
        }
    except Exception as e:
        print(f"Error getting sport quote (Quota/API): {str(e)}")
        fallbacks = [
            "Savais-tu que le golf est le seul sport à avoir été pratiqué sur la Lune (en 1971) ?",
            "Le sifflet d'arbitre n'a été utilisé pour la première fois qu'en 1878. Avant, ils utilisaient des mouchoirs !",
            "Savais-tu que Cristiano Ronaldo saute plus haut qu'un joueur NBA moyen ?",
            "Le basket-ball a été inventé en utilisant un panier de pêches comme panier !",
            "Une balle de tennis peut atteindre 263 km/h lors d'un service record !",
            "Le premier match de football retransmis à la télévision a eu lieu en 1937.",
            "Savais-tu qu'au saut en hauteur, on utilisait la technique du 'ventral' avant l'invention du Fosbury-flop ?",
            "Le record du monde du marathon est de 2h 00min 35s. C'est presque 21km/h de moyenne !",
            "Michael Jordan a été coupé de son équipe de basket de lycée avant de devenir une légende.",
            "Le tennis de table (Ping-pong) a été inventé en Angleterre comme un passe-temps après le dîner.",
            "Savais-tu que les premiers Jeux Olympiques modernes ont eu lieu à Athènes en 1896 ?",
            "Le maillot jaune du Tour de France a été créé en 1919 pour que le leader soit plus visible."
        ]
        return {
            "quote": random.choice(fallbacks),
            "from_llm": False
        }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
