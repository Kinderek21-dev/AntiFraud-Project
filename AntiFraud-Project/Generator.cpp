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
    "Dominik", "Paulina",
    "Rafal", "Sebastian", "Artur", "Przemyslaw", "Bogdan", "Leszek",
    "Henryk", "Cezary", "Adrian", "Damian", "Igor", "Konrad",
    "Emil", "Hubert", "Norbert", "Arkadiusz", "Dariusz", "Roman",
    "Zenon", "Kazimierz",
    "Renata", "Bozena", "Grażyna", "Ilona", "Lucyna", "Aneta",
    "Justyna", "Klaudia", "Patrycja", "Weronika", "Oliwia",
    "Gabriela", "Martyna", "Kinga", "Sandra", "Angelika"
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
    "Maciejewski", "Szczepanski", "Zukowski", "Czarnecki", "Kalinowski",
    "Kubiak", "Urban", "Sadowski", "Lis", "Wilk", "Baran",
    "Kaczor", "Kurek", "Cieslak", "Sobczak", "Musial", "Tomczyk",
    "Kopeć", "Bednarek", "Cieślak", "Polak", "Kania", "Piątek",
    "Mróz", "Sroka", "Bąk", "Rogowski", "Borowski", "Kaczmarczyk",
    "Kowalczyk", "Stępień", "Wasilewski", "Kurek", "Kubiński", "Gajda",
    "Brzezinski", "Kaczynski", "Morawski", "Piasecki", "Sikorski",
    "Zielonka", "Czarnecki", "Kowalik", "Witkowski", "Konieczny",
    "Balcerzak", "Gajewski", "Biernacki", "Marcinkowski", "Szulc",
    "Kozak", "Olejniczak", "Błaszczyk", "Rybicki", "Kurek",
    "Chojnacki", "Szymczak", "Kaczmarek", "Pietrzak", "Zdanowski",
    "Klimczak", "Kubiak", "Kaźmierczak", "Matusiak", "Sikorski",
    "Kaczorowski", "Bartczak", "Kowalewski", "Cichocki", "Lisowski",
    "Zaręba", "Borkowski", "Kaczmarczyk", "Grzelak", "Kucharski",
    "Głowacki", "Kozłowski", "Królak", "Buczek", "Tomczak",
    "Ratajczak", "Kaczmarek", "Walczak", "Sadowski", "Zieliński",
    "Pawlak", "Michalak", "Wrona", "Sowa", "Orłowski",
    "Janicki", "Urbanek", "Szulc", "Górny", "Czajkowski",
    "Kaczmarczyk", "Polakowski", "Sikora", "Baranowski", "Kania",
    "Szewczyk", "Wolski", "Kruk", "Dąbrowski", "Adamowski"
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


std::vector<Transakcja> Generator::generujTransakcje(const std::vector<int>& dostepne_id, int ilosc) {
    std::vector<Transakcja> transakcje;
    if (dostepne_id.size() < 2) return transakcje;

    for (int i = 0; i < ilosc; i++) {
        int idx_nadawcy = rand() % dostepne_id.size();
        int idx_odbiorcy = rand() % dostepne_id.size();
        while (idx_nadawcy == idx_odbiorcy) {
            idx_odbiorcy = rand() % dostepne_id.size();
        }
        double kwota = (rand() % 500) + 10.0;
        transakcje.push_back({ dostepne_id[idx_nadawcy], dostepne_id[idx_odbiorcy], kwota });
    }
    return transakcje;
}
