from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import bcrypt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.post("/api/login")
def login_user(data: LoginData):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT haslo_hash FROM Administratorzy WHERE login = %s;", (data.login,))
    result = cur.fetchone()
    cur.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=401, detail="Nieprawidłowy login lub hasło")
    db_hash = result[0]
    if bcrypt.checkpw(data.password.encode('utf-8'), db_hash.encode('utf-8')):
        return {"message": "Zalogowano pomyślnie!", "status": "success"}
    else:
        raise HTTPException(status_code=401, detail="Nieprawidłowy login lub hasło")

@app.get("/api/stats")
def get_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM Transakcje;")
        total_transactions = cur.fetchone()[0]

        cur.close()
        conn.close()

        return {
            "analyzed_transactions": total_transactions,
            "detected_anomalies": 0 
        }
    except Exception as e:
        return {"error": str(e)}



@app.get("/api/chart")
def get_chart_data(filter: str = "live"):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if filter == "live":

            cur.execute("""
                SELECT TO_CHAR(czas_transakcji, 'HH24:MI') as czas, COUNT(*) 
                FROM Transakcje 
                GROUP BY TO_CHAR(czas_transakcji, 'HH24:MI') 
                ORDER BY MAX(czas_transakcji) DESC LIMIT 15;
            """)
        else:

            cur.execute("""
                SELECT TO_CHAR(czas_transakcji, 'YYYY-MM-DD') as czas, COUNT(*) 
                FROM Transakcje 
                GROUP BY TO_CHAR(czas_transakcji, 'YYYY-MM-DD') 
                ORDER BY MAX(czas_transakcji) DESC LIMIT 15;
            """)

        results = cur.fetchall()
        cur.close()
        conn.close()


        results.reverse()

        labels = [row[0] for row in results]
        transactions = [row[1] for row in results]

        return {
            "labels": labels,
            "transactions": transactions,
            "anomalies": [0] * len(labels) 
        }
    except Exception as e:
        return {"error": str(e)}