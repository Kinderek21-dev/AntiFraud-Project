#include <iostream>
#include <string>
#include <cstdlib>
#include <ctime>
#include <cmath>

using namespace std;

struct Klient {
    int id;
    string imie;
    string nazwisko;
};

struct Konto {
    int id;
    int id_klienta;
    string numer_konta;
    double saldo;
};

struct Transakcja {
    int id;
    int id_nadawcy;
    int id_odbiorcy;
    double kwota;
};




double losujKwote(double min, double max) {
    double f = (double)rand() / RAND_MAX;
    double wylosowana = min + f * (max - min);
    return round(wylosowana * 100.0) / 100.0;
}

int main() {
    srand(time(0));
    cout << "Start generatora AntiFraud" << endl;
    Klient k1 = { 1, "Jan", "Kowalski" };
    Konto ko1 = { 1, 1, "PL123456789", 1500.5 };

    for (int i = 1; i <= 5; i++) {
        Transakcja t;
        t.id = i;
        t.id_nadawcy = 1;
        t.id_odbiorcy = 2;
        t.kwota = losujKwote(10.0, 500.0);
        cout << "Transakcja " << t.id << " kwota: " << t.kwota << " PLN" << endl;

        if (ko1.saldo >= t.kwota) {
            ko1.saldo -= t.kwota;
            cout << "Transakcja " << t.id << " zrealizowana. Kwota: " << t.kwota
                << " PLN. Pozostale saldo: " << ko1.saldo << " PLN" << endl;
        }
        else {
            cout << "Transakcja " << t.id << " ODRZUCONA. Kwota: "
                << t.kwota << " PLN" << endl;
        }
    }
    return 0;
}