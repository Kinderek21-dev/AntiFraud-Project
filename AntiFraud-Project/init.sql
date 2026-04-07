CREATE TABLE Administratorzy (
    UniqueID SERIAL PRIMARY KEY,
    login VARCHAR(50) UNIQUE NOT NULL,
    haslo_hash VARCHAR(255) NOT NULL
);

CREATE TABLE Konta (
    UniqueID SERIAL PRIMARY KEY,
    nazwa_wlasciciela VARCHAR(100) NOT NULL,
    saldo DECIMAL(15, 2) DEFAULT 0.00,
    waluta VARCHAR(3) DEFAULT 'PLN',
    data_utworzenia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Aktywne'
);

CREATE TABLE Transakcje (
    UniqueID SERIAL PRIMARY KEY,
    id_konta_nadawcy INT REFERENCES Konta(UniqueID),
    id_konta_odbiorcy INT REFERENCES Konta(UniqueID),
    kwota DECIMAL(15, 2) NOT NULL,
    waluta VARCHAR(3) DEFAULT 'PLN',
    czas_transakcji TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_operacji VARCHAR(20) DEFAULT 'Zrealizowana',
    status_analizy VARCHAR(20) DEFAULT 'Oczekujaca'
);
CREATE INDEX idx_czas_transakcji ON Transakcje(czas_transakcji);

CREATE TABLE Wyniki_ML (
    UniqueID SERIAL PRIMARY KEY,
    id_transkacji INT UNIQUE REFERENCES Transakcje(UniqueID),
    ocena_anomali DECIMAL(5, 4) NOT NULL,
    czy_podejrzana BOOLEAN NOT NULL,
    data_utworzenia TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Alerty (
    UniqueID SERIAL PRIMARY KEY,
    id_administratora INT REFERENCES Administratorzy(UniqueID),
    typ_alertu VARCHAR(50) NOT NULL,
    data_utworzenia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Nowy'
);

CREATE TABLE Transakcje_Alerty (
    id_transakcji INT REFERENCES Transakcje(UniqueID),
    id_alertu INT REFERENCES Alerty(UniqueID),
    PRIMARY KEY (id_transakcji, id_alertu)
);