#pragma once
#include <pqxx/pqxx>
#include <string>
#include <vector>
#include "Generator.h"

class DatabaseManager {
private:
    pqxx::connection C;
public:
    DatabaseManager(const std::string& conn_str);
    void zapiszKonta(const std::vector<Konto>& konta);
};
