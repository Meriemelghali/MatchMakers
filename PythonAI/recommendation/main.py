import sys
import json
import logging
from recommendation.scoring import calculate_final_score

def main():
    # Configuration du logging sur stderr pour ne pas polluer stdout (JSON)
    logging.basicConfig(level=logging.ERROR, stream=sys.stderr)
    
    try:
        # 1. Lecture du JSON depuis stdin
        input_data = sys.stdin.read()
        if not input_data:
            return

        data = json.loads(input_data)
        date_heure = data.get('date_heure')
        terrains = data.get('terrains', [])
        
        recommandations = []
        
        # 2. Calcul du score pour chaque terrain
        for t in terrains:
            result = calculate_final_score(t, date_heure)
            recommandations.append({
                "terrain_id": t['id'],
                "score": result['score'],
                "raisons": result['raisons'],
                "details": result['details']
            })
            
        # 3. Tri par score décroissant
        recommandations.sort(key=lambda x: x['score'], reverse=True)
        
        # 4. Écriture du JSON sur stdout
        output = {
            "recommandations": recommandations
        }
        print(json.dumps(output, ensure_ascii=False))

    except Exception as e:
        error_msg = {"error": str(e)}
        print(json.dumps(error_msg))
        sys.exit(1)

if __name__ == "__main__":
    main()
