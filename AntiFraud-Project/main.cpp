#include <iostream>
#include <string>

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
    return min + f * (max - min);
}

int main() {
    srand(time(0));
    cout << "Start generatora AntiFraud" << endl;
    Klient k1 = { 1, "Jan", "Kowalski" };
    Konto ko1 = { 1, 1, "PL123456789", 1500.50 };

    for (int i = 1; i <= 5; i++) {
        Transakcja t;
        t.id = i;
        t.id_nadawcy = 1;
        t.id_odbiorcy = 2;
        t.kwota = losujKwote(10.0, 500.0);
        cout << "Transakcja " << t.id << " kwota: " << t.kwota << " PLN" << endl;
    }
    return 0;
}