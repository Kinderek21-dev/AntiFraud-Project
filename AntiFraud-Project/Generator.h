#pragma once
#include <string>
#include <vector>

struct Konto {
    std::string nazwa_wlasciciela;
    double saldo;
};

class Generator {
private:
    std::vector<std::string> imiona;
    std::vector<std::string> nazwiska;
public:
    Generator();
};