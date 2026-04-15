#include "DatabaseManager.h"
#include <iostream>

DatabaseManager::DatabaseManager(const std::string& conn_str) : C(conn_str) {
    if (C.is_open()) {
        std::cout << "Polaczono z baza: " << C.dbname() << std::endl;
    }
    else {
        std::cout << "Blad polaczenia z baza." << std::endl;
    }
}
void DatabaseManager::zapiszKonta(const std::vector<Konto>& konta) {
    pqxx::work W(C);
    for (const auto& k : konta) {
        std::string sql = "INSERT INTO Konta (nazwa_wlasciciela, saldo, waluta) VALUES ('" + k.nazwa_wlasciciela + "', " + std::to_string(k.saldo) + ", 'PLN');";
        W.exec(sql);
    }
    W.commit();
    std::cout << "Zapisano " << konta.size() << " kont do bazy." << std::endl;
}

std::vector<std::pair<int, double>> DatabaseManager::pobierzAktywneKonta() {
    std::vector<std::pair<int, double>> konta;
    pqxx::work W(C);
    pqxx::result R = W.exec("SELECT uniqueid, saldo FROM Konta;");
    for (auto row : R) {
        konta.push_back({ row[0].as<int>(), row[1].as<double>() });
    }
    return konta;
}

void DatabaseManager::wykonajTransakcje(const std::vector<Transakcja>& transakcje) {
    pqxx::work W(C);
    for (const auto& t : transakcje) {
        std::string sqlInsert = "INSERT INTO Transakcje (id_konta_nadawcy, id_konta_odbiorcy, kwota, waluta, status_operacji, status_analizy) " 
       "VALUES (" + std::to_string(t.id_nadawcy) + ", " +
        std::to_string(t.id_odbiorcy) + ", " + std::to_string(t.kwota) + ", 'PLN', 'Zrealizowana', 'Oczekujaca');";
        std::string sqlUpdateNadawca = "UPDATE Konta SET saldo = saldo - " + std::to_string(t.kwota) +
            " WHERE uniqueid = " + std::to_string(t.id_nadawcy) + ";";
        std::string sqlUpdateOdbiorca = "UPDATE Konta SET saldo = saldo + " + std::to_string(t.kwota) +
            " WHERE uniqueid = " + std::to_string(t.id_odbiorcy) + ";";

        W.exec(sqlInsert);
        W.exec(sqlUpdateNadawca);
        W.exec(sqlUpdateOdbiorca);
    }
    W.commit();
    std::cout << "Wykonano " << transakcje.size() << " transakcji." << std::endl;
}
