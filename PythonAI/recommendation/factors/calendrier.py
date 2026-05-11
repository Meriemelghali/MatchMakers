import requests
import logging
from datetime import datetime
from functools import lru_cache

# Session pour réutiliser les connexions
session = requests.Session()

@lru_cache(maxsize=10)
def _fetch_holidays(year):
    """
    Récupère les jours fériés pour une année donnée.
    Caché pour éviter de répéter l'appel.
    """
    url = f"https://calendrier.api.gouv.fr/jours-feries/metropole/{year}.json"
    try:
        response = session.get(url, timeout=8)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        logging.error(f"Calendar API fetch error (year {year}): {e}")
    return {}

def get_calendar_score(date_str, ville):
    """
    Vérifie si la date est un jour férié ou pendant les vacances scolaires.
    """
    try:
        dt = datetime.fromisoformat(date_str)
        year = dt.year
        formatted_date = dt.strftime("%Y-%m-%d")
        
        score = 0.5 # Neutre par défaut
        reasons = []

        # 1. Jours fériés (Caché)
        feries = _fetch_holidays(year)
        if formatted_date in feries:
            score += 0.3
            reasons.append(f"Jour férié ({feries[formatted_date]})")

        # 2. Weekend
        if dt.weekday() >= 5:
            score += 0.2
            reasons.append("Weekend")

        return min(1.0, score), ", ".join(reasons) if reasons else "Journée standard"

    except Exception as e:
        logging.error(f"Calendar scoring error: {e}")
        return 0.5, "Données calendrier indisponibles"
