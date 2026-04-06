#include <iostream>
#include <string>
#include <vector>
#include <ctime>
#include "DatabaseManager.h"
#include "Generator.h"

using namespace std;

int main() {
    srand(time(0));
    cout << "Start generatora AntiFraud" << endl;

    string constr = "dbname=antifraud user=postgres password=12345 host=127.0.0.1 port=5432";

    DatabaseManager db(constr);
    Generator gen;

    std::vector<int> dostepneId = db.pobierzIdKont();
    std::cout << "Znaleziono " << dostepneId.size() << " kont w bazie." << std::endl;

    std::vector<Transakcja> paczkaTransakcji = gen.generujTransakcje(dostepneId, 5);

    if (!paczkaTransakcji.empty()) {
        db.wykonajTransakcje(paczkaTransakcji);
    }

    return 0;
}