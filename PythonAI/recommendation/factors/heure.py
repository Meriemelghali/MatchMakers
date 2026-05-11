from datetime import datetime

# Poids des créneaux par heure (basé sur la demande sportive typique en Tunisie)
HOUR_WEIGHTS = {
    0: 0.05, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.05, 5: 0.05,
    6: 0.20, 7: 0.35,
    8: 0.55, 9: 0.60,
    10: 0.70, 11: 0.65,
    12: 0.45, 13: 0.40,
    14: 0.55, 15: 0.65,
    16: 0.80, 17: 0.95,
    18: 1.00, 19: 0.95,   # Créneau roi: 18h-20h
    20: 0.85, 21: 0.70,
    22: 0.40, 23: 0.15,
}

# Poids par jour de la semaine (lundi=0, dimanche=6)
WEEKDAY_WEIGHTS = {
    0: 0.80,  # Lundi
    1: 0.80,  # Mardi
    2: 0.80,  # Mercredi
    3: 0.80,  # Jeudi
    4: 0.90,  # Vendredi
    5: 1.00,  # Samedi
    6: 0.95,  # Dimanche
}


def get_time_score(date_str: str, has_lighting: bool) -> float:
    """
    Calcule le score basé sur l'heure, le jour de semaine et l'éclairage.
    Retourne un score [0.0, 1.0].
    """
    try:
        dt = datetime.fromisoformat(date_str)
    except Exception:
        return 0.5

    hour    = dt.hour
    weekday = dt.weekday()

    # 1. Score horaire (interpolation douce)
    s_hour = HOUR_WEIGHTS.get(hour, 0.5)

    # 2. Score jour de semaine
    s_day = WEEKDAY_WEIGHTS.get(weekday, 0.8)

    # 3. Pénalité éclairage — forte pénalité si nuit sans lumière
    lighting_penalty = 1.0
    if hour >= 20 and not has_lighting:
        lighting_penalty = 0.35
    elif hour >= 19 and not has_lighting:
        lighting_penalty = 0.65

    # 4. Bonus "golden hour" (17h-19h en semaine et week-end)
    golden_bonus = 1.0
    if 17 <= hour <= 19:
        golden_bonus = 1.08  # Petit boost

    score = s_hour * s_day * lighting_penalty * golden_bonus
    return round(min(1.0, max(0.0, score)), 3)
