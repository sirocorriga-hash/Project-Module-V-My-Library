# Avviare My Library sul tuo computer

Ci sono due modi. Per provarla o usarla basta il **modo A**. Il **modo B** serve quando modifichi il codice e vuoi vedere subito le modifiche.

---

## Modo A: tutto in Docker (consigliato)

Serve solo **Docker Desktop**: https://www.docker.com/products/docker-desktop/
Dopo l'installazione aprilo e aspetta che in basso a sinistra compaia *Engine running*.

**1. Apri un terminale nella cartella del progetto** (quella con `docker-compose.yml`).
- Windows: in Esplora file apri la cartella, scrivi `powershell` nella barra dell'indirizzo e premi Invio.
- Mac: tasto destro sulla cartella → *Servizi* → *Nuovo Terminale nella cartella*.

**2. Crea il file `.env` con le password (solo la prima volta):**

| Windows (PowerShell) | Mac / Linux |
|---|---|
| `powershell -ExecutionPolicy Bypass -File scripts\setup.ps1` | `sh scripts/setup.sh` |

Lo script genera chiavi casuali e crea due file, `.env` e `backend/.env`. Non li condividere e non metterli su GitHub (sono già esclusi da `.gitignore`).

**3. Avvia:**
```
docker compose up --build
```
La prima volta ci mette qualche minuto, perché scarica Postgres, Python e Node e compila il frontend. Quando compare `Listening at: http://0.0.0.0:8000`, apri **http://localhost:8000**.

**4. (Facoltativo) Dati di esempio.** In un secondo terminale:
```
docker compose exec app flask --app wsgi create-demo
```
Poi accedi con `demo@example.com` / `demo1234`.

### Comandi utili

| Cosa | Comando |
|---|---|
| Fermare | `Ctrl+C`, oppure `docker compose down` |
| Riavviare senza ricompilare | `docker compose up` |
| Ricompilare dopo una modifica al codice | `docker compose up --build` |
| Vedere i log | `docker compose logs -f app` |
| **Cancellare anche il database** | `docker compose down -v` (attenzione: elimina tutti i dati) |

Le stesse cose si possono fare dall'interfaccia di Docker Desktop, nella sezione *Containers* → *my-library*.

---

## Modo B: sviluppo con aggiornamento automatico

Docker fa girare solo il database, mentre Flask e React girano direttamente sul computer. Ogni modifica al codice si vede subito, senza ricompilare.

Servono, oltre a Docker Desktop: **Python 3.10+** e **Node.js 20.19+**.

```bash
# 1. solo la prima volta: crea .env e backend/.env (vedi sopra)
sh scripts/setup.sh                     # Windows: powershell -ExecutionPolicy Bypass -File scripts\setup.ps1

# 2. avvia soltanto il database
docker compose up -d db

# 3. backend (terminale 1)
cd backend
python -m venv .venv
source .venv/bin/activate               # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
flask --app wsgi db upgrade             # crea le tabelle
flask --app wsgi create-demo            # facoltativo
flask --app wsgi run --debug            # http://localhost:5000 (API)

# 4. frontend (terminale 2)
cd frontend
npm install
npm run dev                             # apri http://localhost:5173
```
Vite inoltra a Flask tutte le chiamate `/api`, quindi nel browser usi soltanto **http://localhost:5173**.

---

## Problemi frequenti

| Messaggio | Soluzione |
|---|---|
| `Set SECRET_KEY in .env` / `Set POSTGRES_PASSWORD in .env` | Manca il file `.env`: esegui lo script del punto 2. |
| `port is already allocated` sulla 5432 | Sul computer c'è già un altro PostgreSQL. In `.env` metti `DB_PORT=5433`, poi cancella `backend/.env` e rilancia lo script. |
| `port is already allocated` sulla 8000 | Un altro programma usa la porta 8000. In `docker-compose.yml` cambia `"127.0.0.1:8000:8000"` in `"127.0.0.1:8080:8000"` e apri http://localhost:8080. |
| `Cannot connect to the Docker daemon` | Docker Desktop non è aperto, oppure non ha finito di avviarsi. |
| `password authentication failed` dopo aver rigenerato `.env` | Il database era stato creato con la password precedente. Esegui `docker compose down -v` (cancella i dati) e riavvia. |
| Script PowerShell bloccato | Usa esattamente il comando con `-ExecutionPolicy Bypass` mostrato sopra. |

## Test

```bash
cd backend && pytest                    # serve requirements-dev.txt
cd frontend && npm test && npm run typecheck
```
