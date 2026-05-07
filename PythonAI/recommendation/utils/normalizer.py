def min_max_normalize(value, min_val, max_val):
    """Normalise une valeur entre 0 et 1. Gère les cas où min == max."""
    if min_val == max_val:
        return 0.5
    normalized = (value - min_val) / (max_val - min_val)
    return max(0.0, min(1.0, normalized))

def scale_boolean(value):
    """Convertit un booléen en 1.0 (True) ou 0.0 (False)."""
    return 1.0 if value else 0.0

def clamp(value, min_val=0.0, max_val=1.0):
    """Limite une valeur entre les bornes spécifiées."""
    return max(min_val, min(max_val, value))
