#include <iostream>
#include <string>

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


using namespace std;

int main() {
    cout << "Start generatora AntiFraud" << endl;
    Klient k1 = { 1, "Jan", "Kowalski" };
    Konto ko1 = { 1, 1, "PL123456789", 1500.50 };
    cout << "Utworzono klienta: " << k1.imie << " " << k1.nazwisko << endl;
    return 0;
}