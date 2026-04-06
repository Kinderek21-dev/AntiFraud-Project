#include "Generator.h"
#include <cstdlib>
#include <ctime>

Generator::Generator() {
    imiona = {
     "Jan", "Anna", "Piotr", "Katarzyna", "Michal", "Agnieszka",
     "Tomasz", "Maria", "Pawel", "Malgorzata", "Krzysztof", "Barbara",
     "Marcin", "Krystyna", "Jakub", "Ewa", "Andrzej", "Elzbieta",
     "Stanislaw", "Zofia", "Wojciech", "Teresa", "Maciej", "Magdalena",
     "Marek", "Joanna", "Lukasz", "Jadwiga", "Grzegorz", "Danuta",
     "Mateusz", "Halina", "Dawid", "Beata", "Szymon", "Aleksandra",
     "Kamil", "Marta", "Kacper", "Dorota", "Antoni", "Monika",
     "Aleksander", "Jolanta", "Filip", "Iwona", "Wiktor", "Alicja",
     "Mikolaj", "Sylwia", "Patryk", "Natalia", "Oskar", "Karolina",
     "Dominik", "Paulina"
    };

    nazwiska = {
        "Kowalski", "Nowak", "Wisniewski", "Wojcik", "Kaminski", "Lewandowski",
        "Zielinski", "Szymanski", "Wozniak", "Kozlowski", "Jankowski", "Mazur",
        "Wojciechowski", "Kwiatkowski", "Krawczyk", "Kaczmarek", "Piotrowski",
        "Grabowski", "Zajac", "Pawlowski", "Michalski", "Krol", "Wieczorek",
        "Jablonski", "Wrobel", "Nowakowski", "Majewski", "Olszewski", "Stepien",
        "Malinowski", "Jaworski", "Adamczyk", "Dudek", "Gorski", "Pawlak",
        "Sikora", "Walczak", "Rutkowski", "Michalak", "Szewczyk", "Ostrowski",
        "Tomaszewski", "Zalewski", "Wroblewski", "Marciniak", "Jasinski",
        "Zawadzki", "Baczynski", "Chmielewski", "Krupa", "Borkowski",
        "Maciejewski", "Szczepanski", "Zukowski", "Czarnecki", "Kalinowski"
    };
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