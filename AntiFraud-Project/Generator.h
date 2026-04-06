#pragma once
#include <string>
#include <vector>

struct Konto {
    std::string nazwa_wlasciciela;
    double saldo;
};

struct Transakcja {
    int id_nadawcy;
    int id_odbiorcy;
    double kwota;
};

class Generator {
private:
    std::vector<std::string> imiona;
    std::vector<std::string> nazwiska;
public:
    Generator();
    std::vector<Konto> generujKonta(int ilosc);
    std::vector<Transakcja> generujTransakcje(const std::vector<int>& dostepne_id, int ilosc);
};