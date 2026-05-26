from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class Administrator(Base):
    __tablename__ = "administratorzy"
    uniqueid = Column(Integer, primary_key=True, index=True)
    status = Column(String)

class Konto(Base):
    __tablename__ = "konta"
    uniqueid = Column(Integer, primary_key=True, index=True)
    status = Column(String)

class Transakcja(Base):
    __tablename__ = "transakcje"
    uniqueid = Column(Integer, primary_key=True, index=True)
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
    akcja = Column(String)
    notatka = Column(String)