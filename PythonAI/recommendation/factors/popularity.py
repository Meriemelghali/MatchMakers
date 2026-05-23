"""
Popularity & Momentum Factor
Analyse la tendance de popularité d'un terrain sur plusieurs fenêtres temporelles.
Utilise un système de decay exponentiel pour valoriser les réservations récentes.
"""
from datetime import datetime, timedelta
import math


def get_popularity_score(terrain: dict, all_reservations: list, target_datetime: str) -> tuple[float, list[str]]:
    """
    Calcule un score de popularité basé sur la tendance dynamique des réservations.

    Args:
        terrain: Données du terrain
        all_reservations: Liste de toutes les réservations pour ce terrain
        target_datetime: Date/heure cible

    Returns:
        (score, raisons)
    """
    terrain_id = terrain.get("id", "")
    reasons = []

    if not all_reservations:
        return 0.4, []

    try:
        target_dt = datetime.fromisoformat(target_datetime)
    except Exception:
        return 0.5, []

    # Filtrer les réservations non-annulées
    valid_reservations = [r for r in all_reservations
                          if r.get("statutR") not in ("CANCELLED", "ANNULEE")
                          and r.get("terrainId") == terrain_id]

    if not valid_reservations:
        return 0.4, ["Nouveau terrain"]

    # 1. Score decay exponentiel — les réservations récentes comptent plus
    decay_score = 0.0
    total_decay_weight = 0.0

    for res in valid_reservations:
        try:
            res_dt = datetime.fromisoformat(res.get("startTimeR", ""))
            days_ago = (target_dt - res_dt).days
            if days_ago < 0:
                continue  # Réservations futures non comptées

            # Decay: e^(-lambda * days_ago), lambda = 0.1 → demi-vie ~7 jours
            decay_weight = math.exp(-0.1 * days_ago)
            decay_score += decay_weight
            total_decay_weight += 1.0
        except Exception:
            continue

    # Normaliser le score de popularité (0 à 1)
    if total_decay_weight > 0:
        normalized_popularity = min(1.0, decay_score / max(1, total_decay_weight) * 2)
    else:
        normalized_popularity = 0.4

    # 2. Analyse des fenêtres temporelles (7j, 14j, 30j)
    window_counts = {"7j": 0, "14j": 0, "30j": 0}
    for res in valid_reservations:
        try:
            res_dt = datetime.fromisoformat(res.get("startTimeR", ""))
            days_ago = (target_dt - res_dt).days
            if 0 <= days_ago <= 7:
                window_counts["7j"] += 1
            if 0 <= days_ago <= 14:
                window_counts["14j"] += 1
            if 0 <= days_ago <= 30:
                window_counts["30j"] += 1
        except Exception:
            continue

    # 3. Calcul de la tendance (momentum)
    momentum = 1.0
    if window_counts["14j"] > 0:
        # Si les 7 derniers jours > première moitié des 14 derniers
        first_half = window_counts["14j"] - window_counts["7j"]
        if window_counts["7j"] > first_half * 1.3:
            momentum = 1.15
            reasons.append("📈 En forte progression")
        elif window_counts["7j"] < first_half * 0.7:
            momentum = 0.90
            reasons.append("📉 Moins populaire récemment")

    # 4. Thresholds pour les messages
    recent_count = window_counts["7j"]
    if recent_count >= 8:
        reasons.insert(0, "🔥 Très populaire")
    elif recent_count >= 4:
        reasons.insert(0, "⭐ Populaire")
    elif recent_count == 0 and window_counts["30j"] == 0:
        reasons = ["🆕 Peu de données"]

    final_score = round(min(1.0, normalized_popularity * momentum), 3)
    return final_score, reasons[:2]
