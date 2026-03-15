# Zadanie 2: Czat Czasu Rzeczywistego z Logowaniem i Archiwizacją
Prosta aplikacja webowa realizująca czat (SPA) oparty na Node.js, Express, REST API, Socket.IO i TypeScript.

## Działanie Aplikacji
1. **Logowanie i Autoryzacja:**
   - Użytkownik podaje swój pseudonim w widoku logowania.
   - Żądanie `POST /api/login` generuje token JWT (ważny 2h).
   - W ramach bezpieczeństwa (fingerprinting) w tokenie zaszyte jest IP oraz User-Agent przeglądarki. Token jest sprawdzany przez `authMiddleware` przy kolejnych żądaniach, chroniąc przed jego kradzieżą.
2. **REST API i Middleware:**
   - `logger`: Osobny middleware wypisuje w konsoli serwera każde żądanie (np. `[2026-03-15T12:00:00.000Z] POST /api/login`).
   - `authMiddleware`: Blokuje dostęp do `/api/messages` dla niezalogowanych osób.
   - Po poprawnym zalogowaniu pobierana jest cała poprzednia historia czatu za pomocą żądania `GET /api/messages`.
   - Każde wysłanie nowej wiadomości następuje przez `POST /api/messages`.
3. **Czat w czasie rzeczywistym i Socket.IO:**
   - Zalogowany klient nawiązuje połączenie WebSocket.
   - Kiedy na serwer (przez REST API) wpada nowa wiadomość, jest ona dopisywana do tablicy w pamięci RAM, a następnie serwer rozgłasza ją asynchronicznie (broadcast) do wszystkich połączonych klientów.
   - Na froncie jest też mały panel (`Ostatnie żądanie:`), który dynamicznie wyświetla, pod jaki endpoint (i jaką metodą) uderzono.
4. **Archiwizacja:**
   - Każda nowa wiadomość po dodaniu do pamięci jest automatycznie zapisywana do pliku `messages.json` (przy pomocy metody `fs.writeFile`).
   - Podczas uruchomienia serwera, ładuje on historię z pliku `messages.json`, dzięki czemu czat posiada pełną persystencję i nie traci historii po restarcie Node.js.

## Użyte technologie
- **Backend:** `Node.js`, `Express.js` (serwowanie widoku, REST API, routing).
- **Socket.IO:** do rozgłaszania nowych wiadomości w czasie rzeczywistym w ułamek sekundy od ich powstania (połączenie z serwerem HTTP).
- **TypeScript:** do ścisłego typowania interfejsów (np. `JwtPayload`, `ChatMessage`, obiekt `Request` ulepszony o pole `user`).
- **JWT (`jsonwebtoken`):** do tworzenia tokenów sesji oraz implementacji "fingerprintingu".
- **Frontend:** Vanilla JS (`HTML`, `CSS`, `TS` z `fetch` API i klientem Socket.IO). Czyste CSS, korzystające ze zmiennych do obsługi kolorów i responsywności (podobnie jak w zadaniu z quizem).

## Zdjęcia dzałającej aplikacji
![Przykładowe logowanie](./.github/1.png) 
![Przykładowe okno chatu](./.github/2.png) 
![Przykładowe logi serwera](./.github/3.png) 

### Fragment pliku `messages.json`
```json
[
  {
    "id": "1732924141000abcde",
    "username": "Janek",
    "text": "Hej wszystkim, jak tam implementacja?",
    "timestamp": "2026-03-15T12:05:00.000Z"
  }
]
```
