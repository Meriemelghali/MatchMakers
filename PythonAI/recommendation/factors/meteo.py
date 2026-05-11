import requests
import logging
from datetime import datetime, timedelta
from functools import lru_cache

# Session pour réutiliser les connexions
session = requests.Session()

@lru_cache(maxsize=32)
def _fetch_weather_data(lat, lng):
    """
    Récupère les prévisions sur 7 jours pour une position donnée.
    Caché pour éviter de répéter l'appel lors d'une boucle (ex: heatmap).
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude":  lat,
        "longitude": lng,
        "hourly":    "temperature_2m,precipitation,wind_speed_10m,weathercode",
        "timezone":  "auto",
        "forecast_days": 7,
    }
    try:
        response = session.get(url, params=params, timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        logging.error(f"Weather API fetch error: {e}")
    return None

def get_weather_score(lat, lng, date_str):
    """
    Récupère les données météo via Open-Meteo et calcule un score.
    Retourne (score, is_raining, details_str)
    """
    try:
        dt = datetime.fromisoformat(date_str)
        data = _fetch_weather_data(lat, lng)

        if not data or "hourly" not in data:
            return 0.5, False, "Météo non disponible"

        times = data["hourly"]["time"]

        # Trouver l'index de l'heure la plus proche de la date demandée
        # Les dates Open-Meteo sont au format YYYY-MM-DDTHH:00
        target_str = dt.strftime("%Y-%m-%dT%H:00")
        
        try:
            best_idx = times.index(target_str)
        except ValueError:
            # Fallback recherche manuelle
            best_idx = 0
            min_diff = float("inf")
            for i, t in enumerate(times):
                try:
                    t_dt = datetime.fromisoformat(t)
                    diff = abs((t_dt - dt).total_seconds())
                    if diff < min_diff:
                        min_diff = diff
                        best_idx = i
                except Exception:
                    continue
            
            # Si on est trop loin dans le futur (> 7 jours), on sort
            if min_diff > 3600 * 24:
                return 0.5, False, "Hors prévisions météo"

        temp   = data["hourly"]["temperature_2m"][best_idx]
        precip = data["hourly"]["precipitation"][best_idx]
        wind   = data["hourly"]["wind_speed_10m"][best_idx]
        wcode  = data["hourly"].get("weathercode", [0] * len(times))[best_idx]

        # Détection pluie améliorée (code météo WMO ≥ 51 = précipitations)
        is_raining = precip > 0.1 or wcode >= 51

        # ─ Température ───────────────────────────────────────────
        import math
        s_temp = math.exp(-0.5 * ((temp - 20.0) / 8.0) ** 2)

        # ─ Précipitations ────────────────────────────────────────
        s_precip = 1.0 if precip == 0 else max(0.0, 1.0 - (precip / 5.0))

        # ─ Vent ──────────────────────────────────────────────────
        s_wind = 1.0 if wind <= 5 else max(0.0, 1.0 - ((wind - 5) / 45.0))

        # ─ Weather code bonus/malus ────────────────────────────────
        if wcode == 0:
            s_wcode = 1.0
        elif wcode <= 3:
            s_wcode = 0.85
        elif wcode <= 48:
            s_wcode = 0.70
        elif wcode < 80:
            s_wcode = 0.30
        else:
            s_wcode = 0.10

        weather_score = (s_temp * 0.30) + (s_precip * 0.30) + (s_wind * 0.15) + (s_wcode * 0.25)

        detail = f"{temp:.1f}°C, {precip:.1f}mm, vent {wind:.0f} km/h"
        return round(min(1.0, weather_score), 3), is_raining, detail

    except Exception as e:
        logging.error(f"Weather scoring error: {e}")
        return 0.5, False, "Erreur calcul météo"
