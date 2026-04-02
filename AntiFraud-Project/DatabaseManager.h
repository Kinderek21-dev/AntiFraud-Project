#pragma once
#include <pqxx/pqxx>
#include <string>

class DatabaseManager {
private:
    pqxx::connection C;
public:
    DatabaseManager(const std::string& conn_str);
};