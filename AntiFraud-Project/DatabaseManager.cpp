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
        std::string sql = "INSERT INTO Konta (nazwa_wlasciciela, saldo) VALUES ('" + k.nazwa_wlasciciela + "', " + std::to_string(k.saldo) + ");";
        W.exec(sql);
    }
    W.commit();
    std::cout << "Zapisano " << konta.size() << " kont do bazy." << std::endl;
}

std::vector<int> DatabaseManager::pobierzIdKont() {
    std::vector<int> id_kont;
    pqxx::work W(C);
    pqxx::result R = W.exec("SELECT id FROM Konta;");
    for (auto row : R) {
        id_kont.push_back(row[0].as<int>());
    }
    return id_kont;
}
