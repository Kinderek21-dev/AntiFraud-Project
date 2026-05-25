from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import bcrypt
import json
import jwt
from datetime import datetime, timedelta
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CURRENT_THRESHOLD = 0.85
SECRET_KEY = "antifraud_super_secret_key"
ALGORITHM = "HS256"

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

class RegisterData(BaseModel):
    login: str
    password: str
    name: str

class UnblockData(BaseModel):
    transaction_id: int
    receiver_id: int
    sender_id: int

class TransferData(BaseModel):
    sender_id: int
    amount: float
    receiver_id: Optional[int] = None
    receiver_name: Optional[str] = None
    data_wykonania: Optional[str] = None
    typ_przelewu: Optional[str] = "natychmiastowy"

class AdminApproveData(BaseModel):
    admin_id: int
    reason: str 

class ToggleBlockData(BaseModel):
    admin_id: int


async def worker_przelewow_oczekujacych():
    while True:
        try:
            conn = get_db_connection()
            cur = conn.cursor()

            czas_polska = datetime.utcnow() + timedelta(hours=2)
            teraz = czas_polska.strftime("%Y-%m-%d %H:%M:%S")
            
            cur.execute("""
                SELECT uniqueid, id_konta_nadawcy, id_konta_odbiorcy, kwota, status_operacji, czas_transakcji
                FROM Transakcje
                WHERE status_operacji IN ('Zaplanowana', 'Cykliczna')
                  AND czas_transakcji <= %s;
            """, (teraz,))
            
            zlecenia = cur.fetchall()

            for tx in zlecenia:
                tx_id, nadawca, odbiorca, kwota, typ_operacji, stary_czas = tx
                
                cur.execute("""
                    UPDATE Konta SET saldo = saldo - %s 
                    WHERE uniqueid = %s AND saldo >= %s RETURNING uniqueid;
                """, (kwota, nadawca, kwota))
                czy_pobrano = cur.fetchone()

                if czy_pobrano:
                    cur.execute("UPDATE Konta SET saldo = saldo + %s WHERE uniqueid = %s;", (kwota, odbiorca))
                    cur.execute("UPDATE Transakcje SET status_operacji = 'Zrealizowana' WHERE uniqueid = %s;", (tx_id,))
                    
                    if typ_operacji == 'Cykliczna':
                        cur.execute("""
                            INSERT INTO Transakcje (id_konta_nadawcy, id_konta_odbiorcy, kwota, status_operacji, status_analizy, czas_transakcji)
                            VALUES (%s, %s, %s, 'Cykliczna', 'Oczekujaca', %s + INTERVAL '30 days');
                        """, (nadawca, odbiorca, kwota, stary_czas))
                else:
                    cur.execute("UPDATE Transakcje SET status_operacji = 'Odrzucona (Brak Srodkow)' WHERE uniqueid = %s;", (tx_id,))
            
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Wystąpił problem: {e}")
        
        await asyncio.sleep(10)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(worker_przelewow_oczekujacych())


@app.post("/api/user/login")
def login_user_portal(data: LoginData):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT uniqueid, haslo_hash, nazwa_wlasciciela, status FROM Konta WHERE login = %s;", (data.login,))
    result = cur.fetchone()
    cur.close()
    conn.close()

    if not result:
        raise HTTPException(status_code=401, detail="Nieprawidłowy login lub hasło")

    user_id, db_hash, user_name, status = result 
    
    if status == 'Zablokowane':
        raise HTTPException(
            status_code=403, 
            detail="Dostęp zabroniony. Twoje konto zostało zablokowane przez departament bezpieczeństwa AML."
        )
    
    if bcrypt.checkpw(data.password.encode('utf-8'), db_hash.encode('utf-8')):
        expiration = datetime.utcnow() + timedelta(hours=1)
        token = jwt.encode({
            "user_id": user_id,
            "exp": expiration
        }, SECRET_KEY, algorithm=ALGORITHM)
        
        return {
            "status": "success",
            "token": token,
            "user_id": user_id,
            "user_name": user_name
        }
    
    raise HTTPException(status_code=401, detail="Błędne hasło")

@app.post("/api/user/register")
def register_user(data: RegisterData):
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Hasło musi składać się z minimum 6 znaków.")
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        hashed_pw = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cur.execute("""
            INSERT INTO Konta (nazwa_wlasciciela, login, haslo_hash, saldo) 
            VALUES (%s, %s, %s, 10000.00) RETURNING uniqueid;
        """, (data.name, data.login, hashed_pw))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"status": "success", "user_id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Login jest już zajęty lub wystąpił błąd bazy")
    finally:
        cur.close()
        conn.close()

@app.get("/api/user/{user_id}/dashboard")
def get_user_dashboard(user_id: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT saldo FROM Konta WHERE uniqueid = %s;", (user_id,))
        saldo_row = cur.fetchone()
        saldo = float(saldo_row[0]) if saldo_row else 0.0

        cur.execute("""
            SELECT uniqueid, id_konta_nadawcy, id_konta_odbiorcy, kwota, 
                   TO_CHAR(czas_transakcji, 'YYYY-MM-DD HH24:MI'), status_operacji, status_analizy
            FROM Transakcje 
            WHERE id_konta_nadawcy = %s OR id_konta_odbiorcy = %s
            ORDER BY czas_transakcji DESC LIMIT 100;
        """, (user_id, user_id))
        
        history = []
        for row in cur.fetchall():
            is_sender = (row[1] == user_id)
            typ = "Wychodzący" if is_sender else "Przychodzący"
            history.append({
                "id": row[0],
                "typ": typ,
                "kwota": float(row[3]),
                "data": row[4],
                "status_operacji": row[5],
                "status_analizy": row[6],
                "kontrahent": row[2] if is_sender else row[1]
            })
            
        cur.close()
        conn.close()
        return {"saldo": saldo, "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/transfer")
def make_transfer(data: TransferData):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT status FROM Konta WHERE uniqueid = %s;", (data.sender_id,))
        sender_status = cur.fetchone()
        if sender_status and sender_status[0] == 'Zablokowane':
            raise HTTPException(
                status_code=403, 
                detail="Operacja odrzucona. Konto nadawcy posiada status: Zablokowane."
            )
            
        if data.amount <= 0:
            raise HTTPException(status_code=400, detail="Błąd: Kwota przelewu musi być większa niż 0.00 PLN.")

        id_odbiorcy_koncowy = None
        if data.receiver_id:
            cur.execute("SELECT uniqueid FROM Konta WHERE uniqueid = %s;", (data.receiver_id,))
            wynik = cur.fetchone()
            if wynik: id_odbiorcy_koncowy = wynik[0]
        elif data.receiver_name:
            cur.execute("SELECT uniqueid FROM Konta WHERE nazwa_wlasciciela = %s;", (data.receiver_name,))
            wynik = cur.fetchone()
            if wynik: id_odbiorcy_koncowy = wynik[0]

        if id_odbiorcy_koncowy is None:
            raise HTTPException(status_code=404, detail="Błąd operacji: Odbiorca nie istnieje.")

        teraz_polska = datetime.utcnow() + timedelta(hours=2)
        czy_przyszly = False
        data_sql_zformatowana = None
        
        if data.data_wykonania and data.typ_przelewu != "natychmiastowy":
            try:
                data_obiekt = datetime.strptime(data.data_wykonania, "%Y-%m-%dT%H:%M")
                if data_obiekt > teraz_polska:
                    czy_przyszly = True
                data_sql_zformatowana = data_obiekt.strftime("%Y-%m-%d %H:%M:%S")
            except ValueError:
                raise HTTPException(status_code=400, detail="Błąd formatu daty i czasu.")

        if czy_przyszly:
            status_operacji_koncowy = "Zaplanowana" if data.typ_przelewu == "zaplanowany" else "Cykliczna"
            cur.execute("""
                INSERT INTO Transakcje (id_konta_nadawcy, id_konta_odbiorcy, kwota, status_operacji, status_analizy, czas_transakcji)
                VALUES (%s, %s, %s, %s, 'Oczekujaca', %s) RETURNING uniqueid;
            """, (data.sender_id, id_odbiorcy_koncowy, data.amount, status_operacji_koncowy, data_sql_zformatowana))
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"status": "scheduled", "transaction_id": new_id, "detail": f"Zlecenie zaprogramowane na {data_sql_zformatowana}."}
        else:
            cur.execute("""
                UPDATE Konta 
                SET saldo = saldo - %s 
                WHERE uniqueid = %s AND saldo >= %s
                RETURNING uniqueid;
            """, (data.amount, data.sender_id, data.amount))
            
            weryfikacja_salda = cur.fetchone()
            if not weryfikacja_salda:
                raise HTTPException(status_code=400, detail="Odmowa: Brak wystarczających środków na koncie!")

            cur.execute("UPDATE Konta SET saldo = saldo + %s WHERE uniqueid = %s;", (data.amount, id_odbiorcy_koncowy))
            cur.execute("""
                INSERT INTO Transakcje (id_konta_nadawcy, id_konta_odbiorcy, kwota, status_operacji, status_analizy)
                VALUES (%s, %s, %s, 'Zrealizowana', 'Oczekujaca') RETURNING uniqueid;
            """, (data.sender_id, id_odbiorcy_koncowy, data.amount))
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"status": "sent", "transaction_id": new_id, "detail": "Przelew zrealizowany natychmiastowo."}
        
    except HTTPException as he:
        if 'conn' in locals(): conn.rollback()
        raise he
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@app.post("/api/user/unblock")
def unblock_transaction(data: UnblockData):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE Transakcje SET status_analizy = 'Czysty' WHERE uniqueid = %s;", (data.transaction_id,))
        cur.execute("""
            INSERT INTO Zaufani_Odbiorcy (id_nadawcy, id_odbiorcy) 
            VALUES (%s, %s) ON CONFLICT DO NOTHING;
        """, (data.sender_id, data.receiver_id))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success", "message": "Odblokowano i dodano do zaufanych"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/login")
def login_user(data: LoginData):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT uniqueid, haslo_hash, rola, status FROM Administratorzy WHERE login = %s;", (data.login,))
    result = cur.fetchone()
    cur.close()
    conn.close()
    
    if not result: 
        raise HTTPException(status_code=401, detail="Nieprawidłowy login lub hasło admina")
    
    admin_id = result[0]
    db_hash = result[1]
    rola = result[2]
    status = result[3]
    
    if status == 'Zawieszony':
        raise HTTPException(
            status_code=403, 
            detail="Dostęp zablokowany. To konto administratora zostało zawieszone przez audyt wewnętrzny."
        )
    
    try:
        if bcrypt.checkpw(data.password.encode('utf-8'), db_hash.encode('utf-8')):
            return {
                "status": "success",
                "admin_id": admin_id,
                "role": rola
            }
    except:
        pass
    raise HTTPException(status_code=401, detail="Nieprawidłowy login lub hasło admina")

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
        
        amounts = [float(row[2]) for row in results]
        alerts = []
        for row in results:
            raw_score = float(row[3])
            ui_score = round(min(0.99, abs(raw_score) * 2.5 + 0.5), 2)
            if ui_score < CURRENT_THRESHOLD: continue
                
            kwota = float(row[2])
            alert_type = "Nietypowa kwota transakcji"
            
            if amounts.count(kwota) >= 3 and kwota > 100: alert_type = "Wykryto Sieć Piorącą"
            elif kwota < 5: alert_type = "Podejrzana mikropłatność"
            elif kwota > 50000: alert_type = "Odbiorca wysokiego ryzyka"
            elif kwota > 15000: alert_type = "Podejrzana dynamika operacji"

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
                   t.kwota, w.ocena_anomali, t.id_konta_nadawcy, t.id_konta_odbiorcy, w.status, w.xai_raport
            FROM Transakcje t JOIN Wyniki_ML w ON t.uniqueid = w.id_transkacji
            WHERE w.czy_podejrzana = true ORDER BY t.czas_transakcji DESC;
        """)
        results = cur.fetchall()
        cur.close()
        conn.close()
        
        amounts = [float(row[2]) for row in results]
        alerts = []
        for row in results:
            raw_score = float(row[3])
            ui_score = round(min(0.99, abs(raw_score) * 2.5 + 0.5), 2)
            if ui_score < CURRENT_THRESHOLD: continue
            
            kwota = float(row[2])
            alert_type = "Nietypowa kwota transakcji"
            reason = f"Przelew na kwotę {kwota} PLN znacznie odbiega od profilu klienta."
            
            if amounts.count(kwota) >= 3 and kwota > 100:
                alert_type = "Wykryto Sieć Piorącą (Cykl)"
                reason = f"Konto #{row[4]} Wykryto serię powiązanych transakcji na identyczną kwotę {kwota} PLN."
            elif kwota < 5:
                alert_type = "Podejrzana mikropłatność"
                reason = f"Bardzo niska kwota ({kwota} PLN). Możliwe testowanie skradzionej karty."
            elif kwota > 50000:
                alert_type = "Odbiorca wysokiego ryzyka"
                reason = f"Olbrzymia kwota ({kwota} PLN). Ryzyko prania brudnych pieniędzy."
            elif kwota > 15000:
                alert_type = "Podejrzana dynamika operacji"
                reason = f"Nietypowo duży przelew ({kwota} PLN). Możliwe przejęcie konta."

            xai_data = row[7]
            if isinstance(xai_data, str):
                xai_breakdown = json.loads(xai_data)
            elif isinstance(xai_data, list):
                xai_breakdown = xai_data
            else:
                xai_breakdown = []

            alerts.append({
                "id": f"ALR-2026-{str(row[0]).zfill(3)}", "date": row[1], "type": alert_type,
                "score": f"{ui_score:.2f}", "status": row[6], "kwota": kwota,
                "nadawca": row[4], "odbiorca": row[5], "reason": reason,
                "xai": xai_breakdown 
            })
            if len(alerts) >= 100: break
        return alerts
    except Exception as e: return {"error": str(e)}

@app.get("/api/statistics")
def get_statistics():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT DATE(czas_transakcji) as data_dnia, SUM(kwota) as suma_kwot
            FROM Transakcje
            WHERE czas_transakcji >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(czas_transakcji)
            ORDER BY data_dnia ASC;
        """)
        volume_result = cur.fetchall()
        
        dni_tygodnia = ["Pon", "Wto", "Śro", "Czw", "Pią", "Sob", "Nie"]
        volume_data = []
        for row in volume_result:
            data_obj = row[0]
            nazwa_dnia = dni_tygodnia[data_obj.weekday()]
            volume_data.append({"name": nazwa_dnia, "value": float(row[1] or 0)})

        cur.execute("""
            SELECT czy_podejrzana, COUNT(*) as ilosc
            FROM Wyniki_ML
            GROUP BY czy_podejrzana;
        """)
        dist_result = cur.fetchall()
        
        normalne = 0
        anomalie = 0
        for row in dist_result:
            if row[0] == True: anomalie = row[1]
            else: normalne = row[1]

        cur.close()
        conn.close()

        distribution_data = [
            {"name": "Normalne", "value": normalne},
            {"name": "Anomalie", "value": anomalie}
        ]

        return {"volumeData": volume_data, "distributionData": distribution_data}
    except Exception as e:
        return {"volumeData": [], "distributionData": []}

@app.get("/api/graph")
def get_graph_data():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT t.id_konta_nadawcy, t.id_konta_odbiorcy, t.kwota, 
                   COALESCE(w.czy_podejrzana, false) as is_fraud
            FROM Transakcje t
            LEFT JOIN Wyniki_ML w ON t.uniqueid = w.id_transkacji
            ORDER BY t.czas_transakcji DESC LIMIT 100;
        """)
        results = cur.fetchall()
        cur.close()
        conn.close()

        nodes = set()
        links = []
        for row in results:
            nadawca = str(row[0])
            odbiorca = str(row[1])
            kwota = float(row[2])
            is_fraud = row[3]

            nodes.add(nadawca)
            nodes.add(odbiorca)
            links.append({
                "source": nadawca,
                "target": odbiorca,
                "value": kwota,
                "color": "#EF4444" if is_fraud else "#475569" 
            })

        graph_nodes = [{"id": n, "name": f"Konto #{n}"} for n in nodes]
        return {"nodes": graph_nodes, "links": links}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/admin/transakcje/wszystkie")
def get_global_ledger():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT uniqueid, id_konta_nadawcy, id_konta_odbiorcy, kwota, 
                   TO_CHAR(czas_transakcji, 'YYYY-MM-DD HH24:MI:SS'), status_operacji, status_analizy
            FROM Transakcje
            ORDER BY czas_transakcji DESC 
            LIMIT 50000;
        """)
        
        ledger = []
        for row in cur.fetchall():
            ledger.append({
                "id": row[0],
                "nadawca": row[1],
                "odbiorca": row[2],
                "kwota": float(row[3]),
                "data": row[4],
                "status_operacji": row[5],
                "status_analizy": row[6]
            })
            
        cur.close()
        conn.close()
        return ledger
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd odczytu bazy: {str(e)}")

@app.post("/api/admin/alerts/{tx_id}/approve")
def admin_approve_transaction(tx_id: int, data: AdminApproveData):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("BEGIN;")
        cur.execute("UPDATE Transakcje SET status_analizy = 'Zatwierdzona_Recznie' WHERE uniqueid = %s;", (tx_id,))
        cur.execute("UPDATE Wyniki_ML SET status = 'Zatwierdzona_Recznie' WHERE id_transkacji = %s;", (tx_id,))
        
        cur.execute("""
            INSERT INTO admin_audit_log (admin_id, id_transakcji, akcja, notatka)
            VALUES (%s, %s, 'MANUAL_APPROVE', %s);
        """, (data.admin_id, tx_id, data.reason))
        
        conn.commit()
        return {"status": "success", "message": "Przelew zatwierdzony, audyt zapisany."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd: {str(e)}")
    finally:
        cur.close()
        conn.close()

@app.post("/api/admin/users/{user_id}/toggle-block")
def toggle_user_block(user_id: int, data: ToggleBlockData):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("BEGIN;")
        
        cur.execute("SELECT status FROM Konta WHERE uniqueid = %s;", (user_id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Użytkownik o podanym ID nie istnieje.")
        
        obecny_status = result[0]
        nowy_status = 'Zablokowane' if obecny_status == 'Aktywne' else 'Aktywne'
        
        cur.execute("UPDATE Konta SET status = %s WHERE uniqueid = %s;", (nowy_status, user_id))
        
        akcja_log = f"USER_BLOCK_{user_id}" if nowy_status == 'Zablokowane' else f"USER_UNBLOCK_{user_id}"
        cur.execute("""
            INSERT INTO admin_audit_log (admin_id, id_transakcji, akcja)
            VALUES (%s, NULL, %s); 
        """, (data.admin_id, akcja_log))
        
        conn.commit()
        return {"status": "success", "message": f"Zmieniono status użytkownika #{user_id} na: {nowy_status}"}
    except HTTPException as he:
        conn.rollback()
        raise he
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd krytyczny: {str(e)}")
    finally:
        cur.close()
        conn.close()

@app.get("/api/admin/users")
def get_all_users_for_admin():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT k.uniqueid, k.nazwa_wlasciciela, k.status,
                   COALESCE(COUNT(t.uniqueid), 0) as blocked_count
            FROM Konta k
            LEFT JOIN Transakcje t ON k.uniqueid = t.id_konta_nadawcy AND t.status_analizy = 'Zablokowana'
            WHERE k.login != 'admin'
            GROUP BY k.uniqueid, k.nazwa_wlasciciela, k.status
            ORDER BY blocked_count DESC;
        """)
        
        users = []
        for row in cur.fetchall():
            user_id = row[0]
            blocked_count = int(row[3])
            
            risk_level = "Low"
            if blocked_count >= 15: risk_level = "Critical"
            elif blocked_count >= 5: risk_level = "High"
            elif blocked_count >= 1: risk_level = "Medium"
            
            users.append({
                "id": user_id,
                "accId": f"ACC-{str(user_id).zfill(4)}-{str(user_id*3).zfill(4)}", 
                "name": row[1],
                "status": row[2],
                "blockedCount": blocked_count,
                "risk": risk_level
            })
            
        cur.close()
        conn.close()
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/transactions/{tx_id}/request-review")
def request_manual_review(tx_id: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE Transakcje 
            SET status_analizy = 'Do_Weryfikacji' 
            WHERE uniqueid = %s AND status_analizy = 'Zablokowana';
        """, (tx_id,))
        
        cur.execute("""
            UPDATE Wyniki_ML 
            SET status = 'Do_Weryfikacji' 
            WHERE id_transkacji = %s;
        """, (tx_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success", "message": "Zgłoszono do weryfikacji"}
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/list")
def get_all_admins():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT a.uniqueid, a.login, a.rola, a.imie_nazwisko, a.email, a.status, COUNT(l.id) as resolved_cases
            FROM Administratorzy a
            LEFT JOIN admin_audit_log l ON a.uniqueid = l.admin_id AND l.akcja = 'MANUAL_APPROVE'
            GROUP BY a.uniqueid, a.login, a.rola, a.imie_nazwisko, a.email, a.status
            ORDER BY resolved_cases DESC, a.uniqueid ASC;
        """)
        
        admin_list = []
        for row in cur.fetchall():
            admin_list.append({
                "id": row[0],
                "login": row[1],
                "role": row[2],
                "name": row[3],
                "email": row[4],
                "status": row[5], 
                "resolvedCases": row[6]
            })
            
        cur.close()
        conn.close()
        return admin_list
    except Exception as e:
        print(f"BŁĄD SQL W ADMIN LIST: {e}") 
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/transactions/{tx_id}/audit")
def get_transaction_audit(tx_id: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT a.imie_nazwisko, a.rola, l.akcja, l.notatka, l.data_logu 
            FROM admin_audit_log l
            JOIN Administratorzy a ON l.admin_id = a.uniqueid
            WHERE l.id_transakcji = %s
            ORDER BY l.data_logu DESC LIMIT 1;
        """, (tx_id,))
        res = cur.fetchone()
        cur.close()
        conn.close()
        
        if res:
            czas = res[4].strftime("%Y-%m-%d %H:%M") if res[4] else "Brak danych" 
            return {"admin": res[0], "role": res[1], "action": res[2], "reason": res[3], "timestamp": czas}
        return {"message": "Brak notatek dla tej transakcji."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/audit-log/{admin_id}")
def get_admin_audit_log(admin_id: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT login, rola FROM Administratorzy WHERE uniqueid = %s;", (admin_id,))
        admin_data = cur.fetchone()
        if not admin_data:
            raise HTTPException(status_code=404, detail="Admin nie znaleziony")
            
        admin_name = admin_data[0]
        admin_role = admin_data[1]

        cur.execute("""
            SELECT TO_CHAR(l.czas_operacji, 'YYYY-MM-DD HH24:MI') as timestamp,
                   l.id_transakcji as tx_id,
                   l.akcja as action,
                   COALESCE(w.ocena_anomali, 0.0) as ml_score,
                   COALESCE(t.kwota, 0.0) as amount,
                   l.notatka as reason
            FROM admin_audit_log l
            LEFT JOIN Transakcje t ON l.id_transakcji = t.uniqueid
            LEFT JOIN Wyniki_ML w ON l.id_transakcji = w.id_transkacji
            WHERE l.admin_id = %s
            ORDER BY l.czas_operacji DESC;
        """, (admin_id,))
        
        rows = cur.fetchall()
        cur.close()
        conn.close()

        total_actions = len(rows)
        transfers_unlocked = 0
        transfers_blocked = 0
        high_risk_unlocked = 0
        ml_score_sum = 0.0
        ml_score_count = 0

        history = []

        for row in rows:
            action = row[2]
            score = float(row[3])
            
            history.append({
                "timestamp": row[0],
                "tx_id": row[1],
                "action": action,
                "ml_score": score,
                "amount": float(row[4]),
                "reason": row[5] or "Brak notatki"
            })
            
            if action == 'MANUAL_APPROVE':
                transfers_unlocked += 1
                ml_score_sum += score
                ml_score_count += 1
                if score >= 0.95:
                    high_risk_unlocked += 1
            elif action.startswith('USER_BLOCK'):
                transfers_blocked += 1

        avg_ml_score = round(ml_score_sum / ml_score_count, 2) if ml_score_count > 0 else 0.0

        return {
            "admin_name": admin_name,
            "role": admin_role,
            "stats": {
                "total_actions": total_actions,
                "transfers_blocked": transfers_blocked,
                "transfers_unlocked": transfers_unlocked,
                "avg_ml_score": avg_ml_score,
                "high_risk_unlocked": high_risk_unlocked
            },
            "history": history
        }

    except Exception as e:
        print(f"BŁĄD W AUDIT-LOG: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/{admin_id}/suspend")
def suspend_admin(admin_id: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE Administratorzy SET status = 'Zawieszony' WHERE uniqueid = %s;", (admin_id,))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success", "message": "Admin został zawieszony w bazie"}
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))