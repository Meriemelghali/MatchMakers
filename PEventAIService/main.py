import os
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv
import google.generativeai as genai
import json

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
        model = genai.GenerativeModel('gemini-1.5-flash')
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
        # Parse the JSON
        response_text = response.text.strip().removeprefix('```json').removesuffix('```').strip()
        data = json.loads(response_text)
        return data
    except Exception as e:
        print(f"Error calling Gemini: {e}")
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
        model = genai.GenerativeModel('gemini-1.5-flash')
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
        response_text = response.text.strip().removeprefix('```json').removesuffix('```').strip()
        data = json.loads(response_text)
        return data
    except Exception as e:
        print(f"Error calling Gemini for innovation: {e}")
        desc = request.currentType.description or ""
        return {
            "id": request.currentType.id,
            "typeName": request.currentType.typeName,
            "description": f"Évolution 'Elite' ✨ : {desc} - Ce format a été optimisé pour l'immersion.",
            "defaultRules": ["Points mystères", "Bonus d'équipe", "Vote MVP communautaire"]
        }

@app.post("/api/ai/suggest-names")
async def suggest_names(request: NamesRequest):
    if not GEMINI_API_KEY:
        return [f"{request.sport} Classic", f"The {request.sport} {request.type}", f"Elite {request.sport} Masters"]
        
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        Give me 3 creative, catchy and professional names for a sports event.
        Sport: {request.sport}
        Type: {request.type}
        Language: French
        Structure: Respond ONLY with a JSON array of 3 strings.
        """
        response = model.generate_content(prompt)
        text = response.text.strip().removeprefix('```json').removesuffix('```').strip()
        return json.loads(text)
    except Exception as e:
        print(f"Error suggesting names: {e}")
        return [f"{request.sport} Open", f"Challenge {request.sport}", f"{request.sport} Cup"]

@app.post("/api/ai/suggest-description")
async def suggest_description(request: DescriptionRequest):
    if not GEMINI_API_KEY:
        return f"Plongez dans l'intensité du {request.sport} avec cet événement de type {request.type}. Ouvert à tous les passionnés !"
        
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
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
        print(f"Error suggesting description: {e}")
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
        model = genai.GenerativeModel('gemini-1.5-flash')
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
        response_text = response.text.strip().removeprefix('```json').removesuffix('```').strip()
        data = json.loads(response_text)
        return data
    except Exception as e:
        print(f"Error analyzing context: {e}")
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
