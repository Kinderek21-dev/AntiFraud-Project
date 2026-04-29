from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import bcrypt
import math

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
CURRENT_THRESHOLD = 0.85

def get_db_connection():
    return psycopg2.connect(
        host="db",
        database="antifraud",
        user="postgres",
        password="12345",
        port="5432"
    )

class LoginData(BaseModel):
    login: str
    password: str

class StatusData(BaseModel):
    status: str

class SettingsData(BaseModel):
    threshold: float

@app.post("/api/login")
def login_user(data: LoginData):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT haslo_hash FROM Administratorzy WHERE login = %s;", (data.login,))
    result = cur.fetchone()
    cur.close()
    conn.close()
    if not result: raise HTTPException(status_code=401)
    db_hash = result[0]
    if bcrypt.checkpw(data.password.encode('utf-8'), db_hash.encode('utf-8')):
        return {"status": "success"}
    raise HTTPException(status_code=401)

@app.get("/api/settings")
def get_settings():
    return {"threshold": CURRENT_THRESHOLD}

@app.post("/api/settings")
def update_settings(data: SettingsData):
    global CURRENT_THRESHOLD
    CURRENT_THRESHOLD = data.threshold
    return {"message": "Zapisano ustawienia", "threshold": CURRENT_THRESHOLD}

@app.post("/api/alerts/{alert_id}/status")
def update_alert_status(alert_id: str, data: StatusData):
    try:
        db_id = int(alert_id.split("-")[-1])
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE Wyniki_ML SET status = %s WHERE id_transkacji = %s;", (data.status, db_id))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "Zaktualizowano w bazie"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/stats")
def get_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM Transakcje;")
        total_transactions = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM Wyniki_ML WHERE czy_podejrzana = true;")
        total_anomalies = cur.fetchone()[0]
        cur.close()
        conn.close()
        return {"analyzed_transactions": total_transactions, "detected_anomalies": total_anomalies}
    except Exception as e: return {"error": str(e)}

@app.get("/api/chart")
def get_chart_data(filter: str = "live"):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if filter == "live":
            cur.execute("""
                SELECT TO_CHAR(t.czas_transakcji, 'HH24:MI') as czas, COUNT(t.uniqueid) as total,
                       COALESCE(SUM(CASE WHEN w.czy_podejrzana = true THEN 1 ELSE 0 END), 0) as anomalies
                FROM Transakcje t LEFT JOIN Wyniki_ML w ON t.uniqueid = w.id_transkacji
                GROUP BY TO_CHAR(t.czas_transakcji, 'HH24:MI') ORDER BY MAX(t.czas_transakcji) DESC LIMIT 15;
            """)
        else:
            cur.execute("""
                SELECT TO_CHAR(t.czas_transakcji, 'YYYY-MM-DD') as czas, COUNT(t.uniqueid) as total,
                       COALESCE(SUM(CASE WHEN w.czy_podejrzana = true THEN 1 ELSE 0 END), 0) as anomalies
                FROM Transakcje t LEFT JOIN Wyniki_ML w ON t.uniqueid = w.id_transkacji
                GROUP BY TO_CHAR(t.czas_transakcji, 'YYYY-MM-DD') ORDER BY MAX(t.czas_transakcji) DESC LIMIT 15;
            """)
        results = cur.fetchall()
        cur.close()
        conn.close()
        results.reverse()
        return {"labels": [row[0] for row in results], "transactions": [row[1] for row in results], "anomalies": [row[2] for row in results]}
    except Exception as e: return {"error": str(e)}

@app.get("/api/alerts")
def get_alerts():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT t.uniqueid, TO_CHAR(t.czas_transakcji, 'YYYY-MM-DD HH24:MI'), t.kwota, w.ocena_anomali, w.status
            FROM Transakcje t JOIN Wyniki_ML w ON t.uniqueid = w.id_transkacji
            WHERE w.czy_podejrzana = true ORDER BY t.czas_transakcji DESC;
        """)
        results = cur.fetchall()
        cur.close()
        conn.close()
        
        alerts = []
        for row in results:
            raw_score = float(row[3])
            ui_score = round(min(0.99, abs(raw_score) * 2.5 + 0.5), 2)
            
            if ui_score < CURRENT_THRESHOLD:
                continue
                
            alert_type = "Nietypowa kwota transakcji"
            if float(row[2]) < 5: alert_type = "Podejrzana mikropłatność"
            elif float(row[2]) > 50000: alert_type = "Odbiorca wysokiego ryzyka"
            elif float(row[2]) > 15000: alert_type = "Podejrzana dynamika operacji"

            alerts.append({
                "id": f"ALR-2026-{str(row[0]).zfill(3)}",
                "date": row[1], "type": alert_type, "score": f"{ui_score:.2f}",
                "status": row[4]
            })
            if len(alerts) >= 6: break 
        return alerts
    except Exception as e: return {"error": str(e)}

@app.get("/api/alerts/history")
def get_alerts_history():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT t.uniqueid, TO_CHAR(t.czas_transakcji, 'YYYY-MM-DD HH24:MI'), 
                   t.kwota, w.ocena_anomali, t.id_konta_nadawcy, t.id_konta_odbiorcy, w.status
            FROM Transakcje t JOIN Wyniki_ML w ON t.uniqueid = w.id_transkacji
            WHERE w.czy_podejrzana = true ORDER BY t.czas_transakcji DESC;
        """)
        results = cur.fetchall()
        cur.close()
        conn.close()
        
        alerts = []
        for row in results:
            raw_score = float(row[3])
            ui_score = round(min(0.99, abs(raw_score) * 2.5 + 0.5), 2)
            if ui_score < CURRENT_THRESHOLD: continue
            
            kwota = float(row[2])
            alert_type = "Nietypowa kwota transakcji"
            reason = f"Przelew na kwotę {kwota} PLN znacznie odbiega od profilu klienta."
            if kwota < 5:
                alert_type = "Podejrzana mikropłatność"
                reason = f"Bardzo niska kwota ({kwota} PLN). Możliwe testowanie karty."
            elif kwota > 50000:
                alert_type = "Odbiorca wysokiego ryzyka"
                reason = f"Olbrzymia kwota ({kwota} PLN). Ryzyko prania brudnych pieniędzy."
            elif kwota > 15000:
                alert_type = "Podejrzana dynamika operacji"
                reason = f"Nietypowo duży przelew ({kwota} PLN). Możliwe przejęcie konta."

            alerts.append({
                "id": f"ALR-2026-{str(row[0]).zfill(3)}", "date": row[1], "type": alert_type,
                "score": f"{ui_score:.2f}", "status": row[6], "kwota": kwota,
                "nadawca": row[4], "odbiorca": row[5], "reason": reason
            })
            if len(alerts) >= 100: break
        return alerts
    except Exception as e: return {"error": str(e)}