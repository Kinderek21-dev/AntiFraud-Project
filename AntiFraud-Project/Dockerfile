FROM ubuntu:22.04
RUN apt-get update && apt-get install -y g++ libpqxx-dev libpq-dev
WORKDIR /app
COPY . .
RUN g++ main.cpp Generator.cpp DatabaseManager.cpp -o antifraud -lpqxx -lpq
CMD ["./antifraud"]