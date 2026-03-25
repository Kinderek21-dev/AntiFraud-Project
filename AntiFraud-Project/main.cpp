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


using namespace std;

int main() {
    cout << "Start generatora AntiFraud" << endl;
    return 0;
}