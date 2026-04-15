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

    cout << "Analiza obecnej bazy danych..." << endl;
    vector<pair<int, double>> obecneKonta = db.pobierzAktywneKonta();

    if (obecneKonta.size() < 1000) {
        cout << "Baza pusta. Inicjalizacja 10 000 kont poczatkowych..." << endl;
        vector<Konto> startoweKonta = gen.generujKonta(10000);
        db.zapiszKonta(startoweKonta);
    }

    int petla_minuta = 0;
    int licznik_fraudow = 0;


    while (true) {
        vector<pair<int, double>> dostepneKonta = db.pobierzAktywneKonta();

        if (dostepneKonta.size() >= 3) {

            int ilosc_transakcji = (rand() % 40) + 10;
            vector<Transakcja> noweTransakcje = gen.generujTransakcje(dostepneKonta, ilosc_transakcji);
            db.wykonajTransakcje(noweTransakcje);

            licznik_fraudow++;
            if (licznik_fraudow >= 10) {
                vector<Transakcja> fraud = gen.wstrzyknijPralnie(dostepneKonta);
                if (!fraud.empty()) {
                    db.wykonajTransakcje(fraud);
                }
                licznik_fraudow = 0;
            }
        }

        petla_minuta++;
        if (petla_minuta >= 60) {
            cout << "[ROZWOJ BIZNESOWY] Dodano 10 nowych klientow do banku." << endl;
            vector<Konto> nowiKlienci = gen.generujKonta(10);
            db.zapiszKonta(nowiKlienci);
            petla_minuta = 0;
        }

        this_thread::sleep_for(chrono::seconds(1));
    }
    return 0;
}