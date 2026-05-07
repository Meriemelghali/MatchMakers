import requests
import logging
from datetime import datetime

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

        # 1. Jours fériés
        feries_url = f"https://calendrier.api.gouv.fr/jours-feries/metropole/{year}.json"
        res_f = requests.get(feries_url, timeout=3)
        if res_f.status_code == 200:
            feries = res_f.json()
            if formatted_date in feries:
                score += 0.3
                reasons.append(f"Jour férié ({feries[formatted_date]})")

        # 2. Weekend
        if dt.weekday() >= 5:
            score += 0.2
            reasons.append("Weekend")

        return min(1.0, score), ", ".join(reasons) if reasons else "Journée standard"

    except Exception as e:
        logging.error(f"Calendar API error: {e}")
        return 0.5, "Données calendrier indisponibles"
