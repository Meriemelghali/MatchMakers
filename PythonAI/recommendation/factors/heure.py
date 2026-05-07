from datetime import datetime

def get_time_score(date_str, has_lighting):
    """
    Calcule le score basé sur l'heure et l'éclairage.
    """
    dt = datetime.fromisoformat(date_str)
    hour = dt.hour
    
    score_heure = 0.5
    
    # Créneaux prisés
    if 17 <= hour <= 21: # Soirée
        score_heure = 0.9
    elif 10 <= hour <= 12: # Matinée
        score_heure = 0.7
    else:
        score_heure = 0.5
        
    # Pénalité éclairage
    if hour >= 20 and not has_lighting:
        score_heure *= 0.5
        
    return score_heure
