import time
import os
import pandas as pd
import joblib
from sqlalchemy import create_engine, text
from sklearn.ensemble import IsolationForest

DB_URL = "postgresql://postgres:12345@db:5432/antifraud"
engine = create_engine(DB_URL)
MODEL_PATH = "/app/models/moj_mózg_AI.joblib"

def run_ml_job():
    print("[ML WORKER] Budzę się! Pobieram najnowsze, nieocenione transakcje...")
    
    try:
        
        query = """
            SELECT t."uniqueid", t.kwota 
            FROM Transakcje t
            LEFT JOIN Wyniki_ML w ON t."uniqueid" = w.id_transkacji
            WHERE w.id_transkacji IS NULL
            ORDER BY t."uniqueid" DESC 
            LIMIT 1000;
        """
        df = pd.read_sql(query, engine)
        
        if len(df) < 20:
            print(f"[ML WORKER] Mam tylko {len(df)} nowych transakcji. Czekam aż C++ wygeneruje więcej...")
            return

        X = df[['kwota']] 

        if os.path.exists(MODEL_PATH):
            model = joblib.load(MODEL_PATH)
        else:
            print("[ML WORKER] Uczę się od zera")
            model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
            model.fit(X)
            joblib.dump(model, MODEL_PATH)

       
        df['is_fraud'] = model.predict(X)             
        df['anomaly_score'] = model.decision_function(X)

        oszustwa = df[df['is_fraud'] == -1]
        print(f"[ML WORKER] Analiza gotowa. Znaleziono {len(oszustwa)} podejrzanych transakcji.")
        
       
        print("[ML WORKER] Zapisuję wyniki analizy do bazy danych...")
        with engine.begin() as conn:
            for index, row in df.iterrows():
                czy_podejrzana = True if row['is_fraud'] == -1 else False
                ocena = float(row['anomaly_score'])
                id_transakcji = int(row['uniqueid'])
                
                
                insert_query = text("""
                    INSERT INTO Wyniki_ML (id_transkacji, ocena_anomali, czy_podejrzana)
                    VALUES (:id_t, :ocena, :czy_pod)
                    ON CONFLICT (id_transkacji) DO NOTHING;
                """)
                conn.execute(insert_query, {"id_t": id_transakcji, "ocena": ocena, "czy_pod": czy_podejrzana})
                
        print("[ML WORKER] Zapisano pomyślnie! Idę spać na 10 sekund.\n")

    except Exception as e:
        print(f"[ML WORKER] Wystąpił błąd: {e}")

if __name__ == "__main__":
    print("[ML WORKER] Uruchomiono moduł Sztucznej Inteligencji.")
    os.makedirs("/app/models", exist_ok=True)
    
    while True:
        run_ml_job()
        time.sleep(10) 