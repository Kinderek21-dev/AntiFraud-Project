#include "DatabaseManager.h"
#include <iostream>
#include "Generator.h"


int main() {
    std::string constr = "dbname=antifraud user=postgres password=12345 host=db port=5432";    
    DatabaseManager db(constr);

    Generator gen;
    std::vector<Konto> noweKonta = gen.generujKonta(100);
    db.zapiszKonta(noweKonta);
    return 0;
}