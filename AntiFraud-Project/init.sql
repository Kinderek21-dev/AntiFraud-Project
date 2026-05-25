CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE Administratorzy (
    UniqueID SERIAL PRIMARY KEY,
    login VARCHAR(50) UNIQUE NOT NULL,
    haslo_hash VARCHAR(255) NOT NULL,
    imie_nazwisko VARCHAR(100) DEFAULT 'Nieznany',
    rola VARCHAR(100) DEFAULT 'Analityk',
    email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Aktywny'
);

CREATE TABLE Konta (
    UniqueID SERIAL PRIMARY KEY,
    nazwa_wlasciciela VARCHAR(100) NOT NULL,
    login VARCHAR(50) UNIQUE,
    haslo_hash VARCHAR(255),
    saldo DECIMAL(15, 2) DEFAULT 0.00,
    waluta VARCHAR(3) DEFAULT 'PLN',
    data_utworzenia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Aktywne'
);

CREATE TABLE Zaufani_Odbiorcy (
    id_nadawcy INT REFERENCES Konta(UniqueID),
    id_odbiorcy INT REFERENCES Konta(UniqueID),
    data_dodania TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_nadawcy, id_odbiorcy)
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
    status VARCHAR(50) DEFAULT 'New',
    data_utworzenia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    xai_raport JSONB
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

CREATE TABLE admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES Administratorzy(UniqueID),
    id_transakcji INT REFERENCES Transakcje(UniqueID) ON DELETE CASCADE,
    akcja VARCHAR(50) NOT NULL,
    notatka TEXT, -- Tego brakowało przy restarcie!
    czas_operacji TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_czas ON admin_audit_log(czas_operacji);



INSERT INTO Administratorzy (login, haslo_hash, imie_nazwisko, rola, email) VALUES 
('admin', crypt('admin123', gen_salt('bf')), 'Robert Martinez', 'Główny Administrator Systemu', 'robert.m@bank.sys'),
('akowalski', crypt('haslo123', gen_salt('bf')), 'Adam Kowalski', 'Starszy Analityk AML', 'a.kowalski@bank.sys'),
('mnowak', crypt('haslo123', gen_salt('bf')), 'Michał Nowak', 'Szef Bezpieczeństwa (CISO)', 'm.nowak@bank.sys'),
('pwisniewski', crypt('haslo123', gen_salt('bf')), 'Piotr Wiśniewski', 'Młodszy Analityk SOC', 'p.wisniewski@bank.sys'),
('kmazur', crypt('haslo123', gen_salt('bf')), 'Katarzyna Mazur', 'Audytor Wewnętrzny', 'k.mazur@bank.sys'),
('jwojcik', crypt('haslo123', gen_salt('bf')), 'Jan Wójcik', 'Specjalista ds. Incydentów', 'j.wojcik@bank.sys');

INSERT INTO Konta (nazwa_wlasciciela, login, haslo_hash, saldo) 
VALUES ('Jan Kowalski', 'janek', crypt('haslo123', gen_salt('bf')), 25000.00);