import pandas as pd
import xgboost as xgb
import pickle
import os

def train_model():
    data_path = 'recommendation/ml/training_data.csv'
    if not os.path.exists(data_path):
        print("Erreur : training_data.csv non trouvé. Lancez d'abord generate_data.py")
        return
        
    df = pd.read_csv(data_path)
    
    X = df[['meteo', 'charge', 'calendrier', 'heure', 'note']]
    y = df['target_score']
    
    # Entraînement d'un régresseur simple
    model = xgb.XGBRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        objective='reg:squarederror'
    )
    
    model.fit(X, y)
    
    # Sauvegarde du modèle
    with open('recommendation/ml/model.pkl', 'wb') as f:
        pickle.dump(model, f)
        
    print("Modèle XGBoost entraîné et sauvegardé dans recommendation/ml/model.pkl")

if __name__ == "__main__":
    train_model()
