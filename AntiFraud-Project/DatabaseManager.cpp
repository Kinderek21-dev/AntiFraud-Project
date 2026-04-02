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