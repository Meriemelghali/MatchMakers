"""
Sport-Terrain Affinity Factor
Mesure la compatibilité entre le type de sport demandé et les caractéristiques du terrain.
"""

# Mapping: type de sport -> surfaces compatibles (score de compatibilité 0.0 à 1.0)
SPORT_SURFACE_COMPATIBILITY = {
    "FOOTBALL": {
        "GAZON": 1.0, "GAZON_SYNTHETIQUE": 0.95, "TERRE_BATTUE": 0.70,
        "BETON": 0.50, "PARQUET": 0.10, "MOQUETTE": 0.40, "SYNTHETIQUE_INDOOR": 0.80
    },
    "FUTSAL": {
        "PARQUET": 1.0, "SYNTHETIQUE_INDOOR": 0.95, "MOQUETTE": 0.85,
        "BETON": 0.60, "GAZON_SYNTHETIQUE": 0.70, "GAZON": 0.30
    },
    "BASKETBALL": {
        "PARQUET": 1.0, "BETON": 0.90, "SYNTHETIQUE_INDOOR": 0.85,
        "GAZON_SYNTHETIQUE": 0.50, "GAZON": 0.20
    },
    "TENNIS": {
        "TERRE_BATTUE": 1.0, "GAZON": 0.95, "BETON": 0.85,
        "GAZON_SYNTHETIQUE": 0.80, "PARQUET": 0.60
    },
    "VOLLEYBALL": {
        "PARQUET": 1.0, "SABLE": 0.90, "SYNTHETIQUE_INDOOR": 0.90,
        "BETON": 0.60, "GAZON": 0.50
    },
    "RUGBY": {
        "GAZON": 1.0, "GAZON_SYNTHETIQUE": 0.85, "TERRE_BATTUE": 0.65,
        "BETON": 0.10
    },
    "HANDBALL": {
        "PARQUET": 1.0, "SYNTHETIQUE_INDOOR": 0.95, "MOQUETTE": 0.80,
        "BETON": 0.55
    },
    "PADEL": {
        "SYNTHETIQUE_INDOOR": 1.0, "GAZON_SYNTHETIQUE": 0.95, "BETON": 0.70
    },
    "NATATION": {
        "PISCINE": 1.0
    }
}

# Amenités utiles par sport
SPORT_AMENITY_WEIGHTS = {
    "FOOTBALL": {"eclairage": 0.8, "vestiaires": 0.9, "parking": 0.5},
    "FUTSAL": {"eclairage": 0.9, "vestiaires": 0.7, "parking": 0.4},
    "BASKETBALL": {"eclairage": 0.8, "vestiaires": 0.5, "parking": 0.4},
    "TENNIS": {"eclairage": 0.7, "vestiaires": 0.8, "bar": 0.5},
    "VOLLEYBALL": {"eclairage": 0.7, "vestiaires": 0.6},
    "RUGBY": {"vestiaires": 1.0, "tribunes": 0.7, "parking": 0.5},
    "HANDBALL": {"eclairage": 0.8, "vestiaires": 0.8},
}


def get_sport_affinity_score(terrain: dict, sport_type: str) -> tuple[float, list[str]]:
    """
    Calcule un score d'affinité entre un terrain et un type de sport.
    Retourne (score, raisons)
    """
    if not sport_type:
        return 0.5, []

    sport_upper = sport_type.upper()
    surface = terrain.get("typeSurface", "GAZON").upper()
    terrain_sport = terrain.get("typeSport", "").upper()

    reasons = []
    scores = []

    # 1. Score de compatibilité surface / sport
    compat_map = SPORT_SURFACE_COMPATIBILITY.get(sport_upper, {})
    surface_score = compat_map.get(surface, 0.5)
    scores.append(surface_score * 0.55)  # Poids 55%

    if surface_score >= 0.9:
        reasons.append(f"Surface idéale pour {sport_type.capitalize()}")
    elif surface_score <= 0.5:
        reasons.append(f"Surface peu adaptée à {sport_type.capitalize()}")

    # 2. Bonus si le terrain est dédié à ce sport
    dedication_score = 1.0 if terrain_sport == sport_upper else 0.5
    scores.append(dedication_score * 0.25)  # Poids 25%
    if dedication_score == 1.0:
        reasons.append("Terrain spécialisé")

    # 3. Score amenités
    amenity_weights = SPORT_AMENITY_WEIGHTS.get(sport_upper, {})
    amenity_score = 0.5  # par défaut
    if amenity_weights:
        total_weight = sum(amenity_weights.values())
        weighted_amenity = sum(
            amenity_weights.get(k, 0) * (1.0 if terrain.get(k, False) else 0.0)
            for k in amenity_weights
        )
        amenity_score = weighted_amenity / total_weight if total_weight > 0 else 0.5
    scores.append(amenity_score * 0.20)  # Poids 20%

    if amenity_score >= 0.8:
        reasons.append("Excellentes installations")
    elif amenity_score <= 0.3:
        reasons.append("Équipements limités")

    final_score = sum(scores)
    return round(min(1.0, max(0.0, final_score)), 3), reasons[:2]
