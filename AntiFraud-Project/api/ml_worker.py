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
    print("\n[ML] Szukam nowych transakcji do analizy...")
    
    try:
        query = """
            SELECT 
                t."uniqueid", 
                t.kwota, 
                k.saldo,
                w.id_transkacji as is_evaluated
            FROM Transakcje t
            JOIN Konta k ON t.id_konta_nadawcy = k."uniqueid"
            LEFT JOIN Wyniki_ML w ON t."uniqueid" = w.id_transkacji
            ORDER BY t."uniqueid" DESC 
            LIMIT 2000;
        """
        df = pd.read_sql(query, engine)
        
        do_oceny = df[df['is_evaluated'].isnull()].copy()
        
        if len(do_oceny) < 10:
            print(f"[ML] Tylko {len(do_oceny)} nowych transakcji")
            return

        df['procent_salda'] = df['kwota'] / (df['saldo'] + 0.01)
        X_all = df[['kwota', 'procent_salda']]
        
        print("[ML] Trenuję...")
        model = IsolationForest(n_estimators=150, contamination=0.03, random_state=42)
        model.fit(X_all)
        joblib.dump(model, MODEL_PATH)

        do_oceny['procent_salda'] = do_oceny['kwota'] / (do_oceny['saldo'] + 0.01)
        X_nowe = do_oceny[['kwota', 'procent_salda']]

        do_oceny['is_fraud'] = model.predict(X_nowe)             
        do_oceny['anomaly_score'] = model.decision_function(X_nowe)

        oszustwa = do_oceny[do_oceny['is_fraud'] == -1]
        print(f"[ML] Zbadano {len(do_oceny)} nowych przelewów. Wyłapano {len(oszustwa)} podejrzanych zachowań.")
        
        print("[ML] Zapisuję punktację do bazy danych...")
        with engine.begin() as conn:
            for index, row in do_oceny.iterrows():
                czy_podejrzana = True if row['is_fraud'] == -1 else False
                ocena = float(row['anomaly_score'])
                id_transakcji = int(row['uniqueid'])
                
                insert_query = text("""
                    INSERT INTO Wyniki_ML (id_transkacji, ocena_anomali, czy_podejrzana)
                    VALUES (:id_t, :ocena, :czy_pod)
                    ON CONFLICT (id_transkacji) DO NOTHING;
                """)
                conn.execute(insert_query, {"id_t": id_transakcji, "ocena": ocena, "czy_pod": czy_podejrzana})
                
        print("[ML] Zapisano pomyślnie.")

    except Exception as e:
        print(f"[ML] Wystąpił błąd: {e}")

if __name__ == "__main__":
    print("[MLR] Uruchomiono moduł Sztucznej Inteligencji.")
    os.makedirs("/app/models", exist_ok=True)
    
    while True:
        run_ml_job()
        time.sleep(10)