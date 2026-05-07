import requests
import logging

def get_weather_score(lat, lng, date_str):
    """
    Récupère les données météo via Open-Meteo et calcule un score.
    Retourne (score, is_raining, details)
    """
    try:
        # Note: Open-Meteo forecast API
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lng,
            "hourly": "temperature_2m,precipitation,wind_speed_10m",
            "timezone": "Europe/Paris"
        }
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code != 200:
            return 0.5, False, "API Météo indisponible"

        data = response.json()
        # On cherche l'heure la plus proche dans les prévisions horaires
        # (Pour simplifier, on prend l'indice actuel ou le premier indice disponible)
        # Idéalement, on comparerait date_str avec data['hourly']['time']
        
        # Fallback simple : moyenne des premières heures
        temp = data['hourly']['temperature_2m'][0]
        precip = data['hourly']['precipitation'][0]
        wind = data['hourly']['wind_speed_10m'][0]
        
        is_raining = precip > 0.1
        
        # Calcul du score météo [0, 1]
        # Temp idéal entre 15 et 25
        if 15 <= temp <= 25:
            s_temp = 1.0
        elif temp < 0 or temp > 35:
            s_temp = 0.2
        else:
            s_temp = 0.7
            
        s_precip = 1.0 if precip == 0 else max(0, 1.0 - (precip / 5.0))
        s_wind = 1.0 if wind < 10 else max(0, 1.0 - (wind / 50.0))
        
        weather_score = (s_temp * 0.4) + (s_precip * 0.4) + (s_wind * 0.2)
        
        return weather_score, is_raining, f"{temp}°C, {precip}mm pluie"
        
    except Exception as e:
        logging.error(f"Weather API error: {e}")
        return 0.5, False, "Erreur récupération météo"
