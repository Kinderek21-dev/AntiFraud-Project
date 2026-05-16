import time
import os
import json
import numpy as np
import pandas as pd
import joblib
import networkx as nx
import shap
from sqlalchemy import create_engine, text
from sklearn.ensemble import IsolationForest

DB_URL = "postgresql://postgres:12345@db:5432/antifraud"
engine = create_engine(DB_URL)
MODEL_PATH = "/app/models/moj_mozg_AI.joblib"

NAZWY_CECH = {
    'kwota': 'Duża kwota przelewu',
    'procent_salda': 'Wyczyszczenie dużej części salda',
    'velocity': 'Nienaturalna prędkość operacji',
    'is_in_cycle': 'Udział w cyklu prania pieniędzy',
    'odchylenie_kwoty': 'Kwota drastycznie odbiega od nawyków',
    'nietypowa_pora': 'Przelew zlecony w nietypowych godzinach',
    'ryzyko_odbiorcy': 'Przelew do obcego / nowego odbiorcy'
}

def init_db():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE Wyniki_ML ADD COLUMN IF NOT EXISTS xai_raport JSONB;"))
    except Exception as e:
        print(f"[ML INIT] Błąd migracji bazy: {e}")

def run_ml_job():
    print("\n[ML] Szukam nowych transakcji do analizy...")
    try:
        query = """
            SELECT 
                t."uniqueid", t.kwota, k.saldo,
                t.id_konta_nadawcy, t.id_konta_odbiorcy,
                EXTRACT(HOUR FROM t.czas_transakcji) as godzina,
                (SELECT COUNT(*) FROM Zaufani_Odbiorcy z WHERE z.id_nadawcy = t.id_konta_nadawcy AND z.id_odbiorcy = t.id_konta_odbiorcy) as is_trusted
            FROM Transakcje t
            JOIN Konta k ON t.id_konta_nadawcy = k."uniqueid"
            LEFT JOIN Wyniki_ML w ON t."uniqueid" = w.id_transkacji
            WHERE w.id_transkacji IS NULL AND t.status_operacji = 'Zrealizowana'
            ORDER BY t."uniqueid" ASC LIMIT 2000;
        """
        df = pd.read_sql(query, engine)
        do_oceny = df.copy()
        
        if len(do_oceny) < 5:
            print(f"[ML] Brak nowych transakcji do oceny. Czekam...")
            return

        stats_query = """
            SELECT id_konta_nadawcy, 
                   AVG(kwota) as srednia_kwota,
                   AVG(EXTRACT(HOUR FROM czas_transakcji)) as srednia_godzina
            FROM Transakcje
            GROUP BY id_konta_nadawcy;
        """
        df_stats = pd.read_sql(stats_query, engine)
        
        df = df.merge(df_stats, on='id_konta_nadawcy', how='left')
        
        df['srednia_kwota'] = df['srednia_kwota'].fillna(df['kwota'])
        df['srednia_godzina'] = df['srednia_godzina'].fillna(df['godzina'])

        df['procent_salda'] = df['kwota'] / (df['saldo'] + 0.01)
        velocity_map = df.groupby('id_konta_nadawcy').size().to_dict()
        df['velocity'] = df['id_konta_nadawcy'].map(velocity_map)

        df['odchylenie_kwoty'] = df['kwota'] / (df['srednia_kwota'] + 0.01)
        diff = np.abs(df['godzina'] - df['srednia_godzina'])
        df['nietypowa_pora'] = np.minimum(diff, 24 - diff)
        df['ryzyko_odbiorcy'] = df['is_trusted'].apply(lambda x: 0.0 if x > 0 else 1.0)

        G = nx.DiGraph()
        for _, row in df.iterrows():
            if row['kwota'] > 1000 or row['velocity'] >= 3:
                G.add_edge(row['id_konta_nadawcy'], row['id_konta_odbiorcy'], trans_id=row['uniqueid'])

        podejrzane_transakcje = set()
        try:
            for cykl in list(nx.simple_cycles(G)):
                if len(cykl) >= 2:
                    for i in range(len(cykl)):
                        u = cykl[i]
                        v = cykl[(i + 1) % len(cykl)]
                        edge_data = G.get_edge_data(u, v)
                        if edge_data: podejrzane_transakcje.add(edge_data['trans_id'])
        except Exception: pass

        df['is_in_cycle'] = df['uniqueid'].apply(lambda x: 10.0 if x in podejrzane_transakcje else 0.0)
        
        cechy = ['kwota', 'procent_salda', 'velocity', 'is_in_cycle', 'odchylenie_kwoty', 'nietypowa_pora', 'ryzyko_odbiorcy']
        X_all = df[cechy]
        
        model = IsolationForest(n_estimators=100, contamination=0.03, random_state=42)
        model.fit(X_all)
        joblib.dump(model, MODEL_PATH)

        do_oceny['is_fraud'] = model.predict(X_all)             
        do_oceny['anomaly_score'] = model.decision_function(X_all)

        print("[ML] Generuję matematyczne dowody XAI dla anomalii...")
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_all)

        print("[ML] Zapisuję wyniki do bazy danych...")
        with engine.begin() as conn:
            for index, row in do_oceny.iterrows():
                
                if df.iloc[index]['is_trusted'] > 0:
                    czy_podejrzana = False
                else:
                    czy_podejrzana = True if row['is_fraud'] == -1 else False
                    
                ocena = float(row['anomaly_score'])
                id_t = int(row['uniqueid'])
                
                xai_raport = []
                if czy_podejrzana:
                    wplyw_cech = np.abs(shap_values[index]) 
                    suma_wplywow = np.sum(wplyw_cech)
                    if suma_wplywow > 0:
                        for idx_cechy, nazwa_cechy in enumerate(cechy):
                            wplyw_procent = round((wplyw_cech[idx_cechy] / suma_wplywow) * 100)
                            if wplyw_procent > 5: 
                                xai_raport.append({
                                    "cecha": NAZWY_CECH[nazwa_cechy],
                                    "wplyw": wplyw_procent,
                                    "kolor": "#EF4444" if wplyw_procent > 40 else ("#F59E0B" if wplyw_procent > 20 else "#3B82F6")
                                })
                        xai_raport = sorted(xai_raport, key=lambda x: x["wplyw"], reverse=True)

                xai_json = json.dumps(xai_raport)

                insert_query = text("""
                    INSERT INTO Wyniki_ML (id_transkacji, ocena_anomali, czy_podejrzana, xai_raport)
                    VALUES (:id_t, :ocena, :czy_pod, CAST(:xai AS JSONB))
                    ON CONFLICT (id_transkacji) 
                    DO UPDATE SET xai_raport = EXCLUDED.xai_raport;
                """)
                conn.execute(insert_query, {"id_t": id_t, "ocena": ocena, "czy_pod": czy_podejrzana, "xai": xai_json})
                
                nowy_status = 'Zablokowana' if czy_podejrzana else 'Czysty'
                update_tx_query = text("""
                    UPDATE Transakcje SET status_analizy = :status WHERE uniqueid = :id_t;
                """)
                conn.execute(update_tx_query, {"status": nowy_status, "id_t": id_t})
                
        print("[ML] Zapisano pomyślnie partię transakcji.")
    except Exception as e:
        print(f"[ML] Wystąpił błąd: {e}")

if __name__ == "__main__":
    print("[ML] Start modułu Sztucznej Inteligencji (Z Analizą Behawioralną)")
    os.makedirs("/app/models", exist_ok=True)
    init_db()
    
    while True:
        run_ml_job()
        time.sleep(5)