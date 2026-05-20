import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

def generate_synthetic_data(n_samples=1000):
    data = []
    
    for i in range(n_samples):
        # Facteurs
        meteo = random.random()
        charge = random.random()
        calendrier = random.random()
        heure = random.random()
        note = random.random()
        
        # Le "vrai" score que le modèle doit apprendre (avec un peu de bruit)
        # On suppose que le client a fini par réserver (target = 1) ou non (target = 0)
        # On simplifie en générant un score continu "target_score"
        
        base_score = (0.30 * meteo + 0.25 * charge + 0.20 * calendrier + 0.15 * heure + 0.10 * note)
        
        # Ajout de bruit aléatoire pour simuler le comportement humain réel
        noise = np.random.normal(0, 0.05)
        target_score = np.clip(base_score + noise, 0, 1)
        
        data.append({
            'meteo': meteo,
            'charge': charge,
            'calendrier': calendrier,
            'heure': heure,
            'note': note,
            'target_score': target_score
        })
        
    df = pd.DataFrame(data)
    df.to_csv('recommendation/ml/training_data.csv', index=False)
    print(f"Généré {n_samples} échantillons dans recommendation/ml/training_data.csv")

if __name__ == "__main__":
    generate_synthetic_data()
