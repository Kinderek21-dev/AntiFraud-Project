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
from sqlalchemy.orm import Session
from fastapi import Depends
from database import SessionLocal, engine
import models
from sqlalchemy import func 
from sqlalchemy import or_

from sqlalchemy import func, case, desc
app = FastAPI()
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
def login_user_portal(data: LoginData, db: Session = Depends(get_db)):
    user = db.query(models.Konto).filter(models.Konto.login == data.login).first()

    if not user:
        raise HTTPException(status_code=401, detail="Nieprawidłowy login lub hasło")

    if user.status == 'Zablokowane':
        raise HTTPException(
            status_code=403, 
            detail="Dostęp zabroniony. Twoje konto zostało zablokowane przez departament bezpieczeństwa AML."
        )
    
    if bcrypt.checkpw(data.password.encode('utf-8'), user.haslo_hash.encode('utf-8')):
        expiration = datetime.utcnow() + timedelta(hours=1)
        token = jwt.encode({
            "user_id": user.uniqueid,
            "exp": expiration
        }, SECRET_KEY, algorithm=ALGORITHM)
        
        return {
            "status": "success",
            "token": token,
            "user_id": user.uniqueid,
            "user_name": user.nazwa_wlasciciela
        }
    
    raise HTTPException(status_code=401, detail="Błędne hasło")

@app.post("/api/user/register")
def user_register(data: RegisterData, db: Session = Depends(get_db)):
    istniejace_konto = db.query(models.Konto).filter(models.Konto.login == data.login).first()
    
    if istniejace_konto:
        raise HTTPException(status_code=400, detail="Ten login jest już w użyciu.")

    nowe_konto = models.Konto(
        nazwa_wlasciciela=data.name,
        login=data.login,
        haslo_hash=func.crypt(data.password, func.gen_salt('bf'))
    )
    
    db.add(nowe_konto)
    
    try:
        db.commit()
        return {"status": "success", "message": "Konto zostało utworzone poprawnie."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Błąd systemu podczas tworzenia konta.")

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
def create_transfer(data: TransferData, db: Session = Depends(get_db)):
    from sqlalchemy import text 
    
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Kwota przelewu musi być większa niż zero.")

    nadawca = db.query(models.Konto).filter(models.Konto.uniqueid == data.sender_id).first()
    odbiorca = db.query(models.Konto).filter(models.Konto.uniqueid == data.receiver_id).first()

    if not nadawca or nadawca.status != 'Aktywne':
        raise HTTPException(status_code=403, detail="Konto nadawcy nie istnieje lub jest zablokowane.")
    
    if not odbiorca:
        raise HTTPException(status_code=404, detail="Konto odbiorcy nie istnieje.")

    if nadawca.saldo < data.amount:
        raise HTTPException(status_code=400, detail="Brak wystarczających środków na koncie.")

    status_op = 'Zrealizowana'
    if data.typ_przelewu == 'zaplanowany':
        status_op = 'Zaplanowana'
    elif data.typ_przelewu == 'cykliczny':
        status_op = 'Cykliczna'

    if status_op == 'Zrealizowana':
        nadawca.saldo -= data.amount
        odbiorca.saldo += data.amount

    nowa_transakcja = models.Transakcja(
        id_konta_nadawcy=data.sender_id,
        id_konta_odbiorcy=data.receiver_id,
        kwota=data.amount,
        status_operacji=status_op,
        status_analizy='Oczekujaca'
    )
    
    try:
        db.add(nowa_transakcja)
        db.flush() 

        if data.data_wykonania and status_op != 'Zrealizowana':
            czysty_czas = str(data.data_wykonania).replace("T", " ") + ":00"
            
            db.execute(
                text("UPDATE Transakcje SET czas_transakcji = :czas WHERE uniqueid = :uid"),
                {"czas": czysty_czas, "uid": nowa_transakcja.uniqueid}
            )

        db.commit()
        typ_msg = "natychmiastowy" if status_op == 'Zrealizowana' else status_op.lower()
        return {"status": "success", "detail": f"Przelew {typ_msg} został przyjęty do realizacji."}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd krytyczny: {str(e)}")

@app.post("/api/user/unblock")
def unblock_transaction(data: UnblockData, db: Session = Depends(get_db)):
    try:
        tx = db.query(models.Transakcja).filter(models.Transakcja.uniqueid == data.transaction_id).first()
        if tx:
            tx.status_analizy = 'Czysty'
            
        istnieje = db.query(models.ZaufanyOdbiorca).filter(
            models.ZaufanyOdbiorca.id_nadawcy == data.sender_id,
            models.ZaufanyOdbiorca.id_odbiorcy == data.receiver_id
        ).first()
        
        if not istnieje:
            nowy_zaufany = models.ZaufanyOdbiorca(
                id_nadawcy=data.sender_id,
                id_odbiorcy=data.receiver_id
            )
            db.add(nowy_zaufany)
            
        db.commit()
        return {"status": "success", "message": "Odblokowano i dodano do zaufanych"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/login")
def login_user(data: LoginData, db: Session = Depends(get_db)):
    admin = db.query(models.Administrator).filter(models.Administrator.login == data.login).first()
    
    if not admin: 
        raise HTTPException(status_code=401, detail="Nieprawidłowy login lub hasło admina")
    
    if admin.status == 'Zawieszony':
        raise HTTPException(
            status_code=403, 
            detail="Dostęp zablokowany. To konto administratora zostało zawieszone przez audyt wewnętrzny."
        )
    
    try:
        if bcrypt.checkpw(data.password.encode('utf-8'), admin.haslo_hash.encode('utf-8')):
            return {
                "status": "success",
                "admin_id": admin.uniqueid,
                "role": admin.rola
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
def update_alert_status(alert_id: str, data: StatusData, db: Session = Depends(get_db)):
    try:
        db_id = int(alert_id.split("-")[-1])
        wynik = db.query(models.WynikML).filter(models.WynikML.id_transkacji == db_id).first()
        
        if wynik:
            wynik.status = data.status
            db.commit()
            return {"status": "Zaktualizowano w bazie"}
        else:
            return {"error": "Nie znaleziono wyniku ML"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total_transactions = db.query(models.Transakcja).count()
    total_anomalies = db.query(models.WynikML).filter(models.WynikML.czy_podejrzana == True).count()
    return {"analyzed_transactions": total_transactions, "detected_anomalies": total_anomalies}

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
                GROUP BY TO_CHAR(t.czas_transakcji, 'HH24:MI') 
                ORDER BY MAX(t.czas_transakcji) DESC LIMIT 15;
            """)
        else:
            cur.execute("""
                SELECT TO_CHAR(t.czas_transakcji, 'YYYY-MM-DD') as czas, COUNT(t.uniqueid) as total,
                       COALESCE(SUM(CASE WHEN w.czy_podejrzana = true THEN 1 ELSE 0 END), 0) as anomalies
                FROM Transakcje t LEFT JOIN Wyniki_ML w ON t.uniqueid = w.id_transkacji
                GROUP BY TO_CHAR(t.czas_transakcji, 'YYYY-MM-DD') 
                ORDER BY MAX(t.czas_transakcji) DESC LIMIT 15;
            """)
            
        results = cur.fetchall()
        cur.close()
        conn.close()
        
        results.reverse()
        
        return {
            "labels": [row[0] for row in results], 
            "transactions": [row[1] for row in results], 
            "anomalies": [row[2] for row in results]
        }
    except Exception as e: 
        return {"error": str(e)}

@app.get("/api/alerts")
def get_alerts():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT t.uniqueid, TO_CHAR(t.czas_transakcji, 'YYYY-MM-DD HH24:MI'), 
                   t.kwota, w.ocena_anomali, w.status
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
                "date": row[1], 
                "type": alert_type, 
                "score": f"{ui_score:.2f}",
                "status": row[4]
            })
            
            if len(alerts) >= 6: break
            
        return alerts
    except Exception as e: 
        print(f"BŁĄD W GET_ALERTS: {e}")
        return {"error": str(e)}

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
def admin_approve_transaction(tx_id: int, data: AdminApproveData, db: Session = Depends(get_db)):
    admin = db.query(models.Administrator).filter(models.Administrator.uniqueid == data.admin_id).first()
    
    if not admin or admin.status == 'Zawieszony':
        raise HTTPException(status_code=403, detail="Odmowa dostępu. Twoje konto administratora jest zawieszone.")

    transakcja = db.query(models.Transakcja).filter(models.Transakcja.uniqueid == tx_id).first()
    wynik = db.query(models.WynikML).filter(models.WynikML.id_transkacji == tx_id).first()

    if not transakcja:
        raise HTTPException(status_code=404, detail="Transakcja nie istnieje.")

    transakcja.status_analizy = 'Zatwierdzona_Recznie'
    if wynik:
        wynik.status = 'Zatwierdzona_Recznie'

    nowy_log = models.AdminAuditLog(
        admin_id=data.admin_id,
        id_transakcji=tx_id,
        akcja='MANUAL_APPROVE',
        notatka=data.reason
    )
    db.add(nowy_log)

    try:
        db.commit()
        return {"status": "success", "message": "Przelew zatwierdzony pomyślnie."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Błąd bazy danych: {str(e)}")

@app.post("/api/admin/users/{user_id}/toggle-block")
def toggle_user_block(user_id: int, data: ToggleBlockData, db: Session = Depends(get_db)):
    konto = db.query(models.Konto).filter(models.Konto.uniqueid == user_id).first()
    
    if not konto:
        raise HTTPException(status_code=404, detail="Konto klienta nie istnieje.")
    
    nowy_status = 'Zablokowane' if konto.status == 'Aktywne' else 'Aktywne'
    konto.status = nowy_status
    
    akcja_log = f"USER_BLOCK_{user_id}" if nowy_status == 'Zablokowane' else f"USER_UNBLOCK_{user_id}"
    
    nowy_log = models.AdminAuditLog(
        admin_id=data.admin_id,
        akcja=akcja_log,
        notatka=f"Administrator zmienił status konta na: {nowy_status}"
    )
    db.add(nowy_log)
    
    try:
        db.commit()
        return {"status": "success", "message": f"Konto uzyskało status: {nowy_status}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Błąd operacji bazodanowej.")

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
def request_manual_review(tx_id: int, db: Session = Depends(get_db)):
    try:
        tx = db.query(models.Transakcja).filter(
            models.Transakcja.uniqueid == tx_id, 
            models.Transakcja.status_analizy == 'Zablokowana'
        ).first()
        
        if tx:
            tx.status_analizy = 'Do_Weryfikacji'
            
        wynik = db.query(models.WynikML).filter(
            models.WynikML.id_transkacji == tx_id
        ).first()
        
        if wynik:
            wynik.status = 'Do_Weryfikacji'
            
        db.commit()
        return {"status": "success", "message": "Zgłoszono do weryfikacji"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/list")
def get_all_admins(db: Session = Depends(get_db)):
    try:
        results = db.query(
            models.Administrator,
            func.count(models.AdminAuditLog.id)
        ).outerjoin(
            models.AdminAuditLog, 
            (models.Administrator.uniqueid == models.AdminAuditLog.admin_id) & 
            (models.AdminAuditLog.akcja == 'MANUAL_APPROVE')
        ).group_by(
            models.Administrator.uniqueid
        ).order_by(
            func.count(models.AdminAuditLog.id).desc(),
            models.Administrator.uniqueid.asc()
        ).all()
        
        admin_list = []
        for admin, resolved_cases in results:
            admin_list.append({
                "id": admin.uniqueid,
                "login": admin.login,
                "role": admin.rola,
                "name": admin.imie_nazwisko,
                "email": getattr(admin, 'email', ""),
                "status": admin.status, 
                "resolvedCases": resolved_cases
            })
            
        return admin_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/transactions/{tx_id}/audit")
def get_transaction_audit(tx_id: int, db: Session = Depends(get_db)):
    try:
        result = db.query(models.AdminAuditLog, models.Administrator).join(
            models.Administrator, models.AdminAuditLog.admin_id == models.Administrator.uniqueid
        ).filter(
            models.AdminAuditLog.id_transakcji == tx_id
        ).order_by(
            models.AdminAuditLog.id.desc()
        ).first()

        if result:
            log, admin = result
            czas = "Brak danych" 
            if hasattr(log, 'czas_operacji') and log.czas_operacji:
                czas = log.czas_operacji.strftime("%Y-%m-%d %H:%M")

            return {
                "admin": admin.imie_nazwisko, 
                "role": admin.rola, 
                "action": log.akcja, 
                "reason": log.notatka, 
                "timestamp": czas
            }

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
def suspend_admin(admin_id: int, db: Session = Depends(get_db)):
    admin = db.query(models.Administrator).filter(models.Administrator.uniqueid == admin_id).first()
    
    if not admin:
        raise HTTPException(status_code=404, detail="Nie znaleziono administratora")
        
    admin.status = 'Zawieszony'
    db.commit()
    
    return {"status": "success", "message": "Admin został zawieszony w bazie"}