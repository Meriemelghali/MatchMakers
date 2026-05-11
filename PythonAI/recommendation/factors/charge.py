def get_charge_score(reservations_actuelles, reservations_semaine_passee, capacite):
    """
    Calcule le score basé sur le taux de remplissage et la tendance.
    """
    # 1. Score de charge inversé (moins c'est chargé, mieux c'est pour recommander la réservation)
    # ou inversement, plus c'est populaire, plus on recommande si place dispo ?
    # Ici on suit : score_charge = (1 - (actuelles/capacité))
    
    if capacite <= 0:
        return 0.5, 1.0 # Fallback
        
    taux_remplissage = min(1.0, reservations_actuelles / capacite)
    score_charge = 1.0 - taux_remplissage
    
    # 2. Boost tendance
    boost_tendance = 1.0
    if reservations_semaine_passee > 0:
        croissance = (reservations_actuelles - reservations_semaine_passee) / reservations_semaine_passee
        if croissance > 0.20:
            boost_tendance = 1.10
            
    return score_charge, boost_tendance
