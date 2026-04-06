#include "DatabaseManager.h"
#include <iostream>
#include "Generator.h"

int main() {
    DatabaseManager db(constr);

    Generator gen;
    std::vector<Konto> noweKonta = gen.generujKonta(100);
    db.zapiszKonta(noweKonta);
    return 0;
}