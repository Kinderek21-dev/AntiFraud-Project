#include <iostream>
#include <string>
#include <vector>
#include <ctime>
#include <thread>  
#include <chrono>
#include "DatabaseManager.h"
#include "Generator.h"

using namespace std;

int main() {
    srand(time(0));

    string constr = "dbname=antifraud user=postgres password=12345 host=db port=5432";

    DatabaseManager db(constr);
    Generator gen;
    while (true) {
        int ilosc_kont = (rand() % 300) + 1;
        vector<Konto> noweKonta = gen.generujKonta(ilosc_kont);
        db.zapiszKonta(noweKonta);

        vector<int> dostepneId = db.pobierzIdKont();
        if (dostepneId.size() >= 2) {
            int ilosc_transakcji = (rand() % 600) + 1;
            vector<Transakcja> noweTransakcje = gen.generujTransakcje(dostepneId, ilosc_transakcji);
            db.wykonajTransakcje(noweTransakcje);
        }

        int czas_pauzy = (rand() % 1) + 1;

        this_thread::sleep_for(chrono::seconds(czas_pauzy));
    }
    return 0;
}