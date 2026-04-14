from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[""], 
    allow_methods=[""],
    allow_headers=[""],
)

def get_db_connection():
    return psycopg2.connect(
        host="db",
        database="antifraud",
        user="postgres",
        password="12345",
        port="5432"
    )

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