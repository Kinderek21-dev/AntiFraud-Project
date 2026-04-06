#include "Generator.h"
#include <cstdlib>
#include <ctime>

Generator::Generator() {
    imiona = { "Jan", "Anna", "Piotr", "Katarzyna", "Michal", "Agnieszka" };
    nazwiska = { "Kowalski", "Nowak", "Wisniewski", "Wojcik", "Kaminski", "Lewandowski" };
    srand(time(NULL));
}
std::vector<Konto> Generator::generujKonta(int ilosc) {
    std::vector<Konto> konta;
    for (int i = 0; i < ilosc; i++) {
        std::string imie = imiona[rand() % imiona.size()];
        std::string nazwisko = nazwiska[rand() % nazwiska.size()];
        double saldo = (rand() % 10000) + 100.0;
        konta.push_back({ imie + " " + nazwisko, saldo });
    }
    return konta;
}

std::vector<Transakcja> Generator::generujTransakcje(const std::vector<int>& dostepne_id, int ilosc) {
    std::vector<Transakcja> transakcje;
    if (dostepne_id.size() < 2) return transakcje;
    return transakcje;
}
