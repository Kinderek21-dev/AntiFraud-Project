from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey
from database import Base

class Administrator(Base):
    __tablename__ = "administratorzy"
    uniqueid = Column(Integer, primary_key=True, index=True)
    login = Column(String, unique=True)
    haslo_hash = Column(String)
    rola = Column(String)
    imie_nazwisko = Column(String)
    status = Column(String, default="Aktywny")

class Konto(Base):
    __tablename__ = "konta"
    uniqueid = Column(Integer, primary_key=True, index=True)
    nazwa_wlasciciela = Column(String)
    login = Column(String, unique=True)
    haslo_hash = Column(String)
    saldo = Column(Float, default=0.0)
    status = Column(String, default="Aktywne")

class Transakcja(Base):
    __tablename__ = "transakcje"
    uniqueid = Column(Integer, primary_key=True, index=True)
    id_konta_nadawcy = Column(Integer)
    id_konta_odbiorcy = Column(Integer)
    kwota = Column(Float)
    status_operacji = Column(String)
    status_analizy = Column(String)

class WynikML(Base):
    __tablename__ = "wyniki_ml"
    uniqueid = Column(Integer, primary_key=True, index=True)
    id_transkacji = Column(Integer)
    czy_podejrzana = Column(Boolean)
    status = Column(String)

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_log"
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer)
    id_transakcji = Column(Integer, nullable=True)
    akcja = Column(String)
    notatka = Column(String)

