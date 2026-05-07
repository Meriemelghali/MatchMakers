import os
import pickle
from .factors.meteo import get_weather_score
from .factors.calendrier import get_calendar_score
from .factors.charge import get_charge_score
from .factors.heure import get_time_score
from .utils.normalizer import min_max_normalize

# Poids par défaut
DEFAULT_WEIGHTS = {
    "meteo": 0.30,
    "charge": 0.25,
    "calendrier": 0.20,
    "heure": 0.15,
    "note": 0.10
}

# Chargement du modèle ML si présent
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'ml', 'model.pkl')
ML_MODEL = None
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, 'rb') as f:
            ML_MODEL = pickle.load(f)
    except:
        pass

def calculate_final_score(terrain, date_str):
    """
    Calcule le score final pour un terrain donné à une date/heure précise.
    """
    # 1. Collecte des facteurs
    s_meteo, is_raining, m_detail = get_weather_score(terrain['latitude'], terrain['longitude'], date_str)
    s_cal, cal_detail = get_calendar_score(date_str, terrain['ville'])
    s_charge, boost_tendance = get_charge_score(
        terrain['reservations_actuelles'], 
        terrain['reservations_semaine_passee'], 
        terrain['capacite']
    )
    s_heure = get_time_score(date_str, terrain['eclairage'])
    s_note = min_max_normalize(terrain.get('note_moyenne', 2.5), 0, 5)

    # 2. Règle de blocage dur (Pluie + Outdoor)
    # On vérifie si le terrain est indoor via SurfaceType (ex: PARQUET, MOQUETTE souvent indoor)
    surface = terrain.get('typeSurface', 'GAZON')
    is_indoor = surface in ['PARQUET', 'MOQUETTE', 'SYNTHETIQUE_INDOOR']
    
    if is_raining and not is_indoor:
        final_score = 0
        raisons = ["Terrain impraticable (Pluie)"]
    else:
        # 3. Calcul du score
        if ML_MODEL:
            try:
                # Prédiction via XGBoost
                import pandas as pd
                features = pd.DataFrame([[s_meteo, s_charge, s_cal, s_heure, s_note]], 
                                     columns=['meteo', 'charge', 'calendrier', 'heure', 'note'])
                weighted_score = float(ML_MODEL.predict(features)[0])
            except:
                # Fallback sur calcul pondéré standard
                weighted_score = (
                    s_meteo * DEFAULT_WEIGHTS["meteo"] +
                    s_charge * DEFAULT_WEIGHTS["charge"] +
                    s_cal * DEFAULT_WEIGHTS["calendrier"] +
                    s_heure * DEFAULT_WEIGHTS["heure"] +
                    s_note * DEFAULT_WEIGHTS["note"]
                )
        else:
            # Calcul pondéré standard
            weighted_score = (
                s_meteo * DEFAULT_WEIGHTS["meteo"] +
                s_charge * DEFAULT_WEIGHTS["charge"] +
                s_cal * DEFAULT_WEIGHTS["calendrier"] +
                s_heure * DEFAULT_WEIGHTS["heure"] +
                s_note * DEFAULT_WEIGHTS["note"]
            )
        
        # 4. Boost tendance
        final_score = weighted_score * boost_tendance
        
        # 5. Génération des raisons
        raisons = []
        if s_meteo > 0.8: raisons.append("Météo idéale")
        if s_charge > 0.7: raisons.append("Terrain très disponible")
        if s_heure > 0.8: raisons.append("Créneau très prisé")
        if boost_tendance > 1: raisons.append("En forte progression")
        if s_note > 0.8: raisons.append("Excellente réputation")
        
        if not raisons:
            raisons.append("Bonne alternative")

    return {
        "score": round(min(1.0, final_score), 2),
        "raisons": raisons[:3],
        "details": {
            "score_meteo": round(s_meteo, 2),
            "score_charge": round(s_charge, 2),
            "score_calendrier": round(s_cal, 2),
            "score_heure": round(s_heure, 2),
            "score_note": round(s_note, 2)
        }
    }
