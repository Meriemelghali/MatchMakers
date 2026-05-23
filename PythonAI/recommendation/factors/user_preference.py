"""
User Preference Factor
Analyse l'historique de réservations de l'utilisateur pour personnaliser les recommandations.
Basé sur: sports préférés, terrains fréquents, créneaux horaires habituels, popularité historique.
"""
from collections import Counter
from datetime import datetime


def get_user_preference_score(terrain: dict, sport_type: str, user_history: list) -> tuple[float, list[str]]:
    """
    Calcule un score basé sur les préférences personnelles de l'utilisateur.

    Args:
        terrain: Données du terrain
        sport_type: Type de sport demandé
        user_history: Liste de réservations passées de l'utilisateur
                      [{"terrainId": "...", "sportId": "...", "startTimeR": "...", "statutR": "..."}, ...]
    Returns:
        (score, raisons)
    """
    if not user_history:
        return 0.5, []

    terrain_id = terrain.get("id", "")
    reasons = []
    scores = []

    # 1. Fidélité au terrain — est-ce que l'utilisateur a déjà réservé ce terrain ?
    terrain_visits = [h for h in user_history if h.get("terrainId") == terrain_id
                      and h.get("statutR") not in ("CANCELLED",)]
    visit_count = len(terrain_visits)
    if visit_count > 0:
        loyalty_score = min(1.0, 0.5 + (visit_count * 0.1))
        reasons.append(f"Terrain habituel ({visit_count} visites)")
    else:
        loyalty_score = 0.4  # Léger malus pour découvrir de nouveaux terrains
    scores.append(loyalty_score * 0.40)

    # 2. Affinité sport — est-ce que l'utilisateur joue souvent à ce sport ?
    sport_counter = Counter(h.get("sportId", "") for h in user_history
                            if h.get("statutR") not in ("CANCELLED",))
    total_sport_reservations = sum(sport_counter.values())

    if total_sport_reservations > 0 and sport_type:
        sport_freq = sport_counter.get(sport_type, 0) / total_sport_reservations
        sport_affinity = min(1.0, 0.5 + sport_freq)
        if sport_freq >= 0.4:
            reasons.append("Sport favori")
    else:
        sport_affinity = 0.5
    scores.append(sport_affinity * 0.30)

    # 3. Fidélité au créneau horaire — est-ce que l'utilisateur réserve souvent à cette heure ?
    # On utilise l'heure actuelle de la prévision pour comparer avec l'heure des réservations passées
    hour_counter = Counter()
    for h in user_history:
        try:
            dt = datetime.fromisoformat(h.get("startTimeR", ""))
            hour_group = dt.hour // 3  # Groupes de 3 heures (0-7, 8-11, 12-14, 15-17, 18-20, 21-23)
            hour_counter[hour_group] += 1
        except Exception:
            pass

    time_score = 0.5
    if hour_counter:
        most_common_group, freq = hour_counter.most_common(1)[0]
        time_score = min(1.0, 0.5 + (freq / max(1, total_sport_reservations)) * 0.5)

    scores.append(time_score * 0.30)

    final_score = sum(scores)

    # Bonus fidélité globale (utilisateur actif)
    if len(user_history) >= 10:
        final_score = min(1.0, final_score * 1.05)
        if not any("actif" in r for r in reasons):
            reasons.append("Utilisateur actif")

    return round(min(1.0, max(0.0, final_score)), 3), reasons[:2]
