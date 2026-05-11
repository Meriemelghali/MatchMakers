import os
import pickle
from datetime import datetime
from .factors.meteo import get_weather_score
from .factors.calendrier import get_calendar_score
from .factors.charge import get_charge_score
from .factors.heure import get_time_score
from .factors.sport_affinity import get_sport_affinity_score
from .factors.user_preference import get_user_preference_score
from .factors.popularity import get_popularity_score
from .utils.normalizer import min_max_normalize, clamp

# ─────────────────────────────────────────────────────────────────────────────
# Poids du moteur de scoring v2 (somme = 1.0)
# ─────────────────────────────────────────────────────────────────────────────
DEFAULT_WEIGHTS = {
    "meteo":          0.22,   # Conditions météo (temps réel)
    "charge":         0.15,   # Disponibilité immédiate
    "calendrier":     0.10,   # Contexte calendaire (fériés / weekend)
    "heure":          0.10,   # Attractivité du créneau horaire
    "note":           0.08,   # Note moyenne terrain (e-réputation)
    "sport_affinity": 0.18,   # Compatibilité sport ↔ terrain (NOUVEAU)
    "user_pref":      0.12,   # Préférences personnalisées (NOUVEAU)
    "popularity":     0.05,   # Tendance / momentum (NOUVEAU)
}

assert abs(sum(DEFAULT_WEIGHTS.values()) - 1.0) < 1e-6, "Les poids doivent sommer à 1.0"

# ─────────────────────────────────────────────────────────────────────────────
# Chargement du modèle ML si présent
# ─────────────────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'ml', 'model.pkl')
ML_MODEL = None
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, 'rb') as f:
            ML_MODEL = pickle.load(f)
        print("[Recommendation] ML model loaded successfully.")
    except Exception as e:
        print(f"[Recommendation] Could not load ML model: {e}")


def _classify_score(score: float) -> str:
    """Retourne un verdict textuel basé sur le score."""
    if score >= 0.85:
        return "Excellent choix ✨"
    if score >= 0.70:
        return "Très bon créneau 👍"
    if score >= 0.55:
        return "Choix correct"
    if score >= 0.40:
        return "Créneau passable"
    return "Créneau déconseillé ⚠️"


def calculate_final_score(terrain: dict, date_str: str, context: dict | None = None) -> dict:
    """
    Calcule le score final de recommandation v2 pour un terrain à une date/heure donnée.

    Args:
        terrain:  Données enrichies du terrain (dict)
        date_str: ISO datetime string (ex: "2026-05-10T18:00:00")
        context:  Contexte optionnel { "sport_type": str, "user_history": list,
                                       "all_reservations": list }

    Returns:
        dict avec score, verdict, raisons détaillées et détails par facteur.
    """
    context = context or {}
    sport_type       = context.get("sport_type", terrain.get("typeSport", ""))
    user_history     = context.get("user_history", [])
    all_reservations = context.get("all_reservations", [])

    # ── 1. Collecte des scores bruts ────────────────────────────────────────
    s_meteo, is_raining, m_detail = get_weather_score(
        terrain.get("latitude", 36.8065),
        terrain.get("longitude", 10.1815),
        date_str
    )
    s_cal, cal_detail = get_calendar_score(date_str, terrain.get("ville", "Tunis"))
    s_charge, boost_tendance = get_charge_score(
        terrain.get("reservations_actuelles", 0),
        terrain.get("reservations_semaine_passee", 0),
        terrain.get("capacite", 10)
    )
    s_heure = get_time_score(date_str, terrain.get("eclairage", False))
    s_note  = min_max_normalize(terrain.get("note_moyenne", 3.0), 0, 5)

    # Nouveaux facteurs v2
    s_affinity, affinity_reasons = get_sport_affinity_score(terrain, sport_type)
    s_user_pref, user_reasons    = get_user_preference_score(terrain, sport_type, user_history)
    s_popularity, pop_reasons    = get_popularity_score(terrain, all_reservations, date_str)

    # ── 2. Règle de blocage dur (pluie sur terrain outdoor) ─────────────────
    surface    = terrain.get("typeSurface", "GAZON").upper()
    is_indoor  = surface in {"PARQUET", "MOQUETTE", "SYNTHETIQUE_INDOOR"}

    if is_raining and not is_indoor:
        final_score = 0.0
        all_reasons = ["⛈️ Terrain impraticable (pluie)"]
        verdict     = "Non disponible par mauvais temps"
    else:
        # ── 3. Calcul du score pondéré ──────────────────────────────────────
        if ML_MODEL:
            try:
                import pandas as pd
                features = pd.DataFrame([[
                    s_meteo, s_charge, s_cal, s_heure, s_note,
                    s_affinity, s_user_pref, s_popularity
                ]], columns=[
                    "meteo", "charge", "calendrier", "heure", "note",
                    "sport_affinity", "user_pref", "popularity"
                ])
                weighted_score = float(ML_MODEL.predict(features)[0])
            except Exception:
                weighted_score = _weighted_sum(
                    s_meteo, s_charge, s_cal, s_heure, s_note,
                    s_affinity, s_user_pref, s_popularity
                )
        else:
            weighted_score = _weighted_sum(
                s_meteo, s_charge, s_cal, s_heure, s_note,
                s_affinity, s_user_pref, s_popularity
            )

        # ── 4. Boost de tendance ────────────────────────────────────────────
        final_score = clamp(weighted_score * boost_tendance)

        # ── 5. Génération des raisons enrichies ─────────────────────────────
        all_reasons = []

        # Météo
        if s_meteo >= 0.85:
            all_reasons.append("☀️ Météo idéale")
        elif s_meteo <= 0.35:
            all_reasons.append("🌧️ Météo défavorable")

        # Disponibilité
        if s_charge >= 0.75:
            all_reasons.append("✅ Terrain très disponible")
        elif s_charge <= 0.25:
            all_reasons.append("⚠️ Terrain quasi complet")

        # Créneau
        if s_heure >= 0.85:
            all_reasons.append("⏰ Créneau très prisé")
        elif s_heure <= 0.40:
            all_reasons.append("🌙 Créneau peu demandé")

        # Calendrier
        if s_cal >= 0.7:
            all_reasons.append(f"📅 {cal_detail}")

        # Affinité sport
        all_reasons.extend(affinity_reasons)

        # Préférences utilisateur
        all_reasons.extend(user_reasons)

        # Popularité / momentum
        all_reasons.extend(pop_reasons)

        # Note terrain
        if s_note >= 0.8:
            all_reasons.append("⭐ Excellente réputation")
        elif s_note <= 0.3:
            all_reasons.append("👎 Note faible")

        if boost_tendance > 1.0:
            all_reasons.append("📈 En forte progression")

        if not all_reasons:
            all_reasons.append("Bonne alternative")

        verdict = _classify_score(final_score)

    return {
        "score":   round(min(1.0, final_score), 3),
        "verdict": verdict,
        "raisons": all_reasons[:4],  # Max 4 raisons affichées
        "details": {
            "score_meteo":          round(s_meteo, 3),
            "score_charge":         round(s_charge, 3),
            "score_calendrier":     round(s_cal, 3),
            "score_heure":          round(s_heure, 3),
            "score_note":           round(s_note, 3),
            "score_sport_affinity": round(s_affinity, 3),
            "score_user_pref":      round(s_user_pref, 3),
            "score_popularity":     round(s_popularity, 3),
            "boost_tendance":       round(boost_tendance, 3),
            "meteo_detail":         m_detail,
            "cal_detail":           cal_detail,
            "is_indoor":            is_indoor,
        }
    }


def _weighted_sum(s_meteo, s_charge, s_cal, s_heure, s_note,
                  s_affinity, s_user_pref, s_popularity) -> float:
    """Calcul pondéré standard avec les poids v2."""
    w = DEFAULT_WEIGHTS
    return (
        s_meteo      * w["meteo"]          +
        s_charge     * w["charge"]         +
        s_cal        * w["calendrier"]     +
        s_heure      * w["heure"]          +
        s_note       * w["note"]           +
        s_affinity   * w["sport_affinity"] +
        s_user_pref  * w["user_pref"]      +
        s_popularity * w["popularity"]
    )
