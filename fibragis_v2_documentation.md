# FibraGIS v2 - Documentazione Tecnica

## Indice

1. [Panoramica del Progetto](#panoramica-del-progetto)
2. [Funzionalità Principali](#funzionalità-principali)
3. [Architettura](#architettura)
   - [Frontend](#frontend)
   - [Backend](#backend)
   - [Database](#database)
4. [Tecnologie Utilizzate](#tecnologie-utilizzate)
5. [Struttura del Progetto](#struttura-del-progetto)
6. [Prerequisiti](#prerequisiti)
7. [Installazione e Configurazione](#installazione-e-configurazione)
   - [Backend](#configurazione-backend)
   - [Database](#configurazione-database)
   - [Frontend](#configurazione-frontend)
8. [Esecuzione dell'Applicazione](#esecuzione-dellapplicazione)
   - [Avvio Backend](#avvio-backend)
   - [Accesso Frontend](#accesso-frontend)
9. [Dettaglio Componenti](#dettaglio-componenti)
   - [Backend API Endpoints](#backend-api-endpoints)
   - [Schema del Database](#schema-del-database)
   - [Componenti Chiave del Frontend](#componenti-chiave-del-frontend)
   - [Script Utili](#script-utili)
10. [Flussi Utente Principali](#flussi-utente-principali)
    - [Registrazione Predisposizione Edificio](#registrazione-predisposizione-edificio)
    - [Gestione TFO](#gestione-tfo)
11. [Considerazioni e Possibili Miglioramenti](#considerazioni-e-possibili-miglioramenti)

---

## 1. Panoramica del Progetto

FibraGIS v2 è un'applicazione web GIS (Geographic Information System) progettata per la registrazione, visualizzazione e gestione di edifici predisposti per la banda ultralarga e delle relative Terminazioni Fibra Ottica (TFO).

L'applicazione consente agli utenti di interagire con una mappa per selezionare edifici, compilare informazioni sulla predisposizione e registrare dettagli specifici delle TFO installate.

Il sistema è composto da un frontend basato su HTML, CSS, JavaScript con Leaflet.js per la mappa e Bootstrap Italia per l'interfaccia, e da un backend API sviluppato in Python utilizzando FastAPI, che interagisce con un database PostgreSQL/PostGIS per la memorizzazione e l'interrogazione dei dati geografici e alfanumerici.

---

## 2. Funzionalità Principali

- **Visualizzazione Mappa Interattiva:** Mostra edifici su una mappa Leaflet, caricati dinamicamente in base all'area visualizzata (Bounding Box) e al livello di zoom.
- **Selezione Edifici da Mappa:** Cliccando su un edificio sulla mappa, i suoi dati (coordinate, ID, uso) popolano automaticamente i campi di un form.
- **Registrazione Predisposizione Edifici:**
  - Salvataggio dei dati di predisposizione di un edificio (indirizzo, comune, codice catastale, data predisposizione).
  - Gli edifici predisposti vengono evidenziati visivamente sulla mappa.
- **Gestione Predisposizioni:**
  - Visualizzazione tabellare degli edifici già predisposti.
  - Modifica dei dati di una predisposizione esistente.
  - Eliminazione di una predisposizione (con cancellazione delle TFO associate).
- **Registrazione Terminazioni Ottiche (TFO):**
  - Per ogni edificio predisposto, è possibile aggiungere una o più TFO.
  - Inserimento dettagli TFO: scala, piano, interno, data, ID operatore, codice TFO, codice ROE.
- **Gestione TFO:**
  - Visualizzazione tabellare delle TFO associate a un edificio predisposto selezionato.
  - Modifica dei dettagli di una TFO esistente.
  - Eliminazione di una TFO.
- **Interfaccia Utente Responsiva:** Utilizzo di Bootstrap Italia per una UI adattabile.
- **Comunicazione API Asincrona:** Il frontend comunica con il backend tramite richieste API HTTP.
- **Feedback Utente:** Notifiche modali per messaggi di successo, errore o conferma.

---

## 3. Architettura

L'applicazione segue un'architettura client-server.

### Frontend

- **Client Web:** Single Page Application (SPA) costruita con HTML, CSS, e JavaScript vanilla.
- **Libreria Mappa:** Leaflet.js per la visualizzazione e interazione con i dati geografici.
- **Framework UI:** Bootstrap Italia per la struttura e lo stile dei componenti dell'interfaccia.
- **Comunicazione:** Effettua chiamate API RESTful al backend per recuperare e inviare dati.
- **Gestione Stato Semplice:** Lo stato è gestito principalmente tramite variabili JavaScript e interazioni DOM dirette.

### Backend

- **Server API:** API RESTful costruita con Python e il framework FastAPI.
- **Logica di Business:** Implementata nei moduli CRUD (`crud_*.py`) che separano le operazioni sui dati dalle definizioni degli endpoint.
- **Validazione Dati:** Pydantic viene utilizzato per la validazione dei dati in input e la serializzazione dei dati in output.
- **Accesso al Database:** Interagisce direttamente con il database PostgreSQL/PostGIS tramite `psycopg2`. L'ORM SQLAlchemy è presente nelle dipendenze ma non attivamente usato per le query principali.

### Database

- **Sistema:** PostgreSQL.
- **Estensione Geografica:** PostGIS per la gestione efficiente di dati spaziali (geometrie degli edifici, centroidi) e per le query geografiche (es. intersection, bbox).
- **Tabelle Principali:**
  - `catasto_abitazioni`: Memorizza i dati anagrafici e geometrici degli edifici, inclusi gli attributi di predisposizione.
  - `verifiche_edifici`: Memorizza i dettagli delle TFO collegate agli edifici predisposti.

---

## 4. Tecnologie Utilizzate

### Backend

- Python 3.9+
- FastAPI: Framework web per la creazione di API.
- Uvicorn: Server ASGI per FastAPI.
- Psycopg2-binary: Adattatore PostgreSQL per Python.
- Pydantic & Pydantic-settings: Per la validazione dei dati e la gestione della configurazione.
- SQLAlchemy: ORM (usato principalmente per la definizione dell'engine e utilità, non per le query CRUD principali).
- GeoPandas, Fiona, Pyproj, Shapely, Pandas: Per l'analisi e la manipolazione di dati geospaziali (usati negli script).
- GeoAlchemy2: Estensioni SQLAlchemy per tipi PostGIS (usati negli script).
- python-dotenv: Per la gestione delle variabili d'ambiente.

### Frontend

- HTML5
- CSS3
- JavaScript (ES6+)
- Leaflet.js 1.9.4: Libreria per mappe interattive.
- Bootstrap Italia 2.6.1: Framework UI basato su Bootstrap.

### Database

- PostgreSQL (consigliato versione 13+)
- PostGIS (consigliato versione 3+)

### Formato Dati Geografici

- GeoJSON

---

## 5. Struttura del Progetto

```
FibraGIS_v2/
├── backend/
│   ├── app/
│   │   ├── apis/               # Moduli con gli endpoint API (geojson.py, predisposizioni.py, tfo.py)
│   │   ├── core/               # Configurazione centrale (config.py)
│   │   ├── crud/               # Operazioni CRUD (Create, Read, Update, Delete) per il DB
│   │   ├── db/                 # Setup e connessione al database (database.py)
│   │   ├── schemas/            # Modelli Pydantic per validazione e serializzazione
│   │   └── main.py             # Applicazione principale FastAPI
│   ├── data/                   # (Cartella prevista per file dati, es. aquila.geojson)
│   ├── scripts/                # Script di utilità (analyze_geojson.py, load_initial_data.py)
│   ├── .env.example            # File di esempio per le variabili d'ambiente
│   └── requirements.txt        # Dipendenze Python del backend
│
└── frontend/
    ├── assets/                 # (Cartella prevista per assets statici, es. Logo.png)
    ├── css/
    │   └── style.css           # Stili CSS personalizzati
    ├── js/
    │   ├── apiService.js       # Servizio per le chiamate API
    │   ├── config.js           # Configurazione del frontend (es. URL API)
    │   ├── main.js             # Script principale di inizializzazione del frontend
    │   ├── map/
    │   │   ├── mapHandler.js   # Logica di gestione della mappa Leaflet
    │   │   └── mapUtils.js     # Funzioni di utilità per la mappa
    │   └── ui/
    │       ├── edificiForm.js  # Logica per il form di registrazione edifici
    │       ├── modals.js       # Gestione dei modali di Bootstrap
    │       ├── navigation.js   # Logica per la navigazione tra sezioni
    │       ├── predisposizioniTable.js # Logica per la tabella delle predisposizioni
    │       ├── tfoForm.js      # Logica per il form delle TFO
    │       └── tfoTable.js     # Logica per la tabella delle TFO
    └── index.html              # Pagina HTML principale dell'applicazione
```

---

## 6. Prerequisiti

- Python 3.9 o superiore.
- `pip` per la gestione dei pacchetti Python.
- PostgreSQL server (versione 13 o superiore consigliata).
- Estensione PostGIS installata e abilitata nel database PostgreSQL.
- Un browser web moderno (es. Chrome, Firefox, Edge).
- Git per clonare il repository (opzionale se si scarica il codice).

---

## 7. Installazione e Configurazione

### Configurazione Backend

1. **Clonare il repository (se non già fatto):**
   ```bash
   git clone <URL_DEL_REPOSITORY> # <-- Ricordati di inserirlo, brutto coglione
   cd FibraGIS_v2/backend
   ```

2. Creare e attivare un ambiente virtuale:
   ```bash
   # Su Windows
   python -m venv .venv
   .venv\Scripts\activate
   
   # Su macOS/Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Installare le dipendenze:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurare le variabili d'ambiente:**
   Creare un file `.env` nella directory `FibraGIS_v2/backend/` copiando da `.env.example` (se fornito) o creandolo con i seguenti contenuti (adattare secondo necessità):
   ```env
   POSTGRES_USER=tuo_utente_postgres
   POSTGRES_PASSWORD=tua_password_postgres
   POSTGRES_HOST=localhost
   POSTGRES_DB=aquila_gis  # o il nome del tuo database
   POSTGRES_PORT=5432
   ```
   Queste variabili sono usate da `app/core/config.py` e `scripts/load_initial_data.py`.

### Configurazione Database

1. **Assicurarsi che PostgreSQL sia in esecuzione.**

2. **Creare un database e un utente** se non si usano quelli di default, corrispondenti ai valori nel file `.env`.
   ```sql
   -- Esempio comandi SQL (da eseguire come superuser Postgres, es. psql -U postgres)
   CREATE USER tuo_utente_postgres WITH PASSWORD 'tua_password_postgres';
   CREATE DATABASE aquila_gis OWNER tuo_utente_postgres;
   GRANT ALL PRIVILEGES ON DATABASE aquila_gis TO tuo_utente_postgres;
   ```

3. **Abilitare l'estensione PostGIS** nel database creato:
   Connettersi al database `aquila_gis` (es. `psql -U tuo_utente_postgres -d aquila_gis`) ed eseguire:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
   Questo comando è anche eseguito dallo script `load_initial_data.py`.

4. **Caricare i dati iniziali (opzionale, ma necessario per il funzionamento con dati):**
   - Assicurarsi che il file `aquila.geojson` (o il file GeoJSON con gli edifici) sia presente nella cartella `FibraGIS_v2/backend/data/`.
   - Eseguire lo script `load_initial_data.py` dalla directory `FibraGIS_v2/backend/`:
     ```bash
     python scripts/load_initial_data.py
     ```
     Questo script creerà le tabelle `catasto_abitazioni` e `verifiche_edifici` (TFO) e caricherà i dati dal GeoJSON.
     
     **⚠️ Attenzione:** Lo script effettua il DROP delle tabelle se esistono, quindi cancella dati preesistenti.

### Configurazione Frontend

1. **Verificare l'URL dell'API Backend:**
   Aprire il file `FibraGIS_v2/frontend/js/config.js`.
   Assicurarsi che la costante `API_BASE_URL` punti correttamente all'indirizzo e porta del backend FastAPI (di default `http://127.0.0.1:8000`).
   ```javascript
   // js/config.js
   const API_BASE_URL = 'http://127.0.0.1:8000';
   ```

2. Non sono richiesti passaggi di build o installazione di dipendenze per il frontend, in quanto è composto da file statici.

---

## 8. Esecuzione dell'Applicazione

### Avvio Backend

1. Navigare nella directory `FibraGIS_v2/backend/`.
2. Attivare l'ambiente virtuale (se non già attivo)
3. Avviare il server FastAPI con Uvicorn:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   L'opzione `--reload` è utile per lo sviluppo, in quanto riavvia il server automaticamente ad ogni modifica del codice. Il server sarà accessibile a `http://127.0.0.1:8000`.

### Accesso Frontend

1. Aprire il file `FibraGIS_v2/frontend/index.html` direttamente in un browser web.
   
   Oppure, per evitare potenziali problemi CORS con `file:///` (anche se `null` è nelle origini consentite), si può servire la cartella `frontend` con un semplice server HTTP:
   ```bash
   # Dalla cartella FibraGIS_v2/frontend/
   python -m http.server 8081
   ```
   E poi accedere a `http://localhost:8081` (o la porta scelta) nel browser.

---

## 9. Dettaglio Componenti

### Backend API Endpoints

L'API è definita in `app/main.py` e nei moduli router in `app/apis/`.

#### Root
- `GET /`: Messaggio di benvenuto.

#### GeoJSON (Edifici)
**Prefix:** `/geojson`, gestito da `app/apis/geojson.py`
- `GET /bbox?west=<float>&south=<float>&east=<float>&north=<float>&zoom=<int>`: Recupera i poligoni degli edifici entro un dato bounding box e livello di zoom. Restituisce un FeatureCollection GeoJSON.

#### Predisposizioni (Edifici Predisposti)
**Prefix:** `/predisposizioni`, gestito da `app/apis/predisposizioni.py`
- `GET /`: Lista tutti gli edifici marcati come predisposti.
- `POST /`: Crea una nuova predisposizione per un edificio o aggiorna una esistente. Richiede l'ID dell'edificio dalla tabella `catasto_abitazioni` e i dettagli della predisposizione.
- `DELETE /{predisposizione_id}`: Rimuove lo stato di predisposizione da un edificio e cancella tutte le TFO associate. L'ID è quello della tabella `catasto_abitazioni`.

#### TFO (Terminazioni Fibra Ottica)
**Prefix:** `/tfos`, gestito da `app/apis/tfo.py`
- `GET /tfos/predisposizioni/{predisposizione_id}/tfos`: Lista tutte le TFO associate a un specifico edificio predisposto (ID da `catasto_abitazioni`).
- `POST /`: Crea una nuova TFO associata a un edificio predisposto.
- `PUT /{tfo_id}`: Aggiorna i dettagli di una TFO esistente (ID dalla tabella `verifiche_edifici`).
- `DELETE /{tfo_id}`: Elimina una TFO specifica (ID dalla tabella `verifiche_edifici`).

### Schema del Database

Definito principalmente nello script `scripts/load_initial_data.py`.

#### Tabella `catasto_abitazioni`
Tabella principale degli edifici.

**Campi:**
- `id`: SERIAL PRIMARY KEY - Identificativo univoco dell'edificio nel database.
- `objectid`: INTEGER - ID originale dal file GeoJSON.
- `edifc_uso`, `edifc_ty`, `edifc_sot`, `classid`, `edifc_nome`, `edifc_stat`, `edifc_at`, `scril`, `meta_ist`, `edifc_mon`: Vari attributi descrittivi dell'edificio.
- `shape_length`, `shape_area`: Attributi geometrici originali.
- `geometry`: GEOMETRY(MULTIPOLYGONZ, 4326) - Geometria dell'edificio in EPSG:4326.
- `centroide`: GEOMETRY(POINT, 4326) - Centroide calcolato della geometria dell'edificio.
- `predisposto_fibra`: BOOLEAN - Flag che indica se l'edificio è predisposto.
- `indirizzo`, `uso_edificio` (ridondante con `edifc_uso` ma compilabile da utente), `comune`, `codice_belfiore`, `codice_catastale`, `data_predisposizione`, `lat`, `lon`: Campi compilati/aggiornati durante la registrazione della predisposizione.

**Indici:** GIST su `geometry` e `centroide` per performance query spaziali.

#### Tabella `verifiche_edifici`
Tabella per le Terminazioni Fibra Ottica (TFO).

**Campi:**
- `id`: SERIAL PRIMARY KEY - Identificativo univoco della TFO.
- `id_abitazione`: INTEGER REFERENCES `catasto_abitazioni(id)` ON DELETE CASCADE - Collega la TFO all'edificio predisposto.
- `scala`, `piano`, `interno`: Dettagli sulla localizzazione della TFO nell'edificio.
- `id_operatore`: TEXT - Identificativo dell'operatore TLC.
- `id_tfo`: TEXT - Codice identificativo univoco della TFO.
- `id_roe`: TEXT - Codice identificativo del ROE (Ripartitore Ottico di Edificio) a cui la TFO è connessa.
- `data_predisposizione_tfo`: DATE - Data specifica di installazione/predisposizione della TFO.

### Componenti Chiave del Frontend

#### Core Components

- **`main.js`:** Punto di ingresso del JavaScript. Inizializza i vari moduli dell'applicazione (navigazione, mappa, gestori form e tabelle).
- **`apiService.js`:** Funzione centralizzata (`sendApiRequest`) per effettuare tutte le chiamate HTTP (GET, POST, PUT, DELETE) al backend. Gestisce la serializzazione JSON, header e la gestione base delle risposte/errori.
- **`config.js`:** Contiene configurazioni globali per il frontend, come `API_BASE_URL` e parametri di default per la mappa (`MAP_DEFAULT_CENTER`, `MAP_DEFAULT_ZOOM`, etc.).

#### Navigation & UI

- **`navigation.js`:** Gestisce la logica per mostrare/nascondere le sezioni principali dell'applicazione ("Lista Edifici" e "Lista TFO") e aggiornare lo stato attivo dei link di navigazione. Invalida la dimensione della mappa quando la sezione edifici viene mostrata.

#### Map Handling

- **`mapHandler.js`:**
  - Inizializza la mappa Leaflet (`initMap`).
  - Gestisce il caricamento dinamico dei dati GeoJSON (edifici) dal backend (`loadBuildingsDataByBounds`) in base ai confini (bbox) e al livello di zoom attuali della mappa.
  - Renderizza i poligoni e i centroidi sulla mappa, stilizzandoli diversamente se un edificio è predisposto.
  - Gestisce l'evento click su un edificio, popolando i campi del form "Registrazione Edifici" con i dati dell'edificio selezionato.
- **`mapUtils.js`:** Fornisce funzioni di utilità per interagire con la mappa, come `markBuildingAsPredispostoOnMap` e `unmarkBuildingAsPredispostoOnMap` per cambiare lo stile di un edificio sulla mappa quando il suo stato di predisposizione cambia.

#### Forms & Tables

- **`edificiForm.js`:**
  - Gestisce il form per la registrazione/modifica della predisposizione di un edificio.
  - Contiene la logica per validare l'input e inviare i dati al backend (`handleSalvaPredisposizione`).
  - Permette di popolare il form per la modifica (`populateEdificiFormForUpdate`) quando si seleziona "Modifica Predisposizione" dalla tabella.

- **`predisposizioniTable.js`:**
  - Carica e visualizza la lista degli edifici predisposti in una tabella (`loadPredisposizioni`).
  - Gestisce la selezione di una riga nella tabella, abilitando i bottoni azione ("Aggiungi TFO", "Modifica Predisposizione", "Elimina Predisposizione").
  - Al click su "Aggiungi TFO", mostra il form per le TFO.
  - Al click su "Modifica Predisposizione", popola il form edifici.
  - Al click su "Elimina Predisposizione", chiede conferma e invia la richiesta di cancellazione.

- **`tfoForm.js`:**
  - Gestisce il form per l'aggiunta o la modifica di una TFO.
  - Popola i campi relativi all'edificio selezionato (indirizzo, coordinate, etc.).
  - Invia i dati della TFO al backend per il salvataggio/aggiornamento (`handleSalvaTfo`).
  - Distinzione tra modalità creazione e modifica (`isEditModeTfo`).

- **`tfoTable.js`:**
  - Carica e visualizza le TFO per l'edificio predisposto attualmente selezionato (`loadTfosForSelectedPredisposizione`).
  - Gestisce la selezione di una TFO nella tabella, abilitando i bottoni "Modifica TFO" e "Elimina TFO".
  - Al click su "Modifica TFO", popola il form TFO con i dati della TFO selezionata.
  - Al click su "Elimina TFO", chiede conferma e invia la richiesta di cancellazione.

- **`modals.js`:** Fornisce due funzioni (`showModal`, `showConfirmModal`) per visualizzare dialoghi modali Bootstrap standard per feedback o richieste di conferma all'utente.

### Script Utili

- **`backend/scripts/analyze_geojson.py`:** Script Python che utilizza GeoPandas per analizzare la struttura di un file GeoJSON (proprietà, tipi di geometrie, valori null, ecc.). Utile per comprendere i dati prima dell'importazione.

- **`backend/scripts/load_initial_data.py`:** Script Python per caricare i dati da un file GeoJSON (specificato `backend/data/aquila.geojson`) nel database PostgreSQL/PostGIS.
  - Crea le tabelle `catasto_abitazioni` e `verifiche_edifici` (dopo averle droppate se esistono).
  - Crea indici spaziali GIST sulle colonne geometriche.
  - Calcola e memorizza il centroide per ogni edificio.
  - Può creare un trigger (`aggiorna_predisposto_fibra_da_tfo`) per marcare un edificio come predisposto se una TFO viene inserita direttamente nel DB (anche se la logica principale di predisposizione è gestita dall'API).

---

## 10. Flussi Utente Principali

### Registrazione Predisposizione Edificio

1. L'utente naviga nella sezione "Lista Edifici" (default).
2. Sulla mappa, zooma fino a un livello sufficiente per visualizzare gli edifici.
3. Clicca su un poligono di un edificio sulla mappa.
4. I dati dell'edificio (lat, lon, ID DB, ID Originale, uso) vengono popolati nei campi readonly del form "Registrazione degli Edifici Predisposti".
5. L'utente compila i campi mancanti obbligatori: "Nome Edificio / Indirizzo", "Comune", "Data di predisposizione".
6. L'utente inserisce eventuali campi opzionali: "Codice Belfiore", "Codice Catastale particella".
7. Clicca su "Salva Predisposizione Edificio".
8. `edificiForm.js` invia una richiesta POST a `/predisposizioni` tramite `apiService.js`.
9. Il backend (`crud_predisposizione.py`) aggiorna il record corrispondente in `catasto_abitazioni`, impostando `predisposto_fibra = true` e salvando gli altri dati.
10. Il frontend mostra un messaggio di successo. L'edificio sulla mappa viene aggiornato visivamente (es. cambio colore).
11. Se l'utente è nella sezione "Lista TFO", la tabella delle predisposizioni si aggiorna.

### Gestione TFO

1. L'utente naviga nella sezione "Lista TFO".
2. La tabella "Edifici Predisposti" viene caricata con tutti gli edifici marcati come `predisposto_fibra = true`.
3. L'utente seleziona un edificio dalla tabella.
4. I bottoni "Aggiungi TFO per Edificio Selezionato", "Modifica Predisposizione", "Elimina Predisposizione" diventano attivi.
5. La tabella "Terminazioni Ottiche (TFO)" sotto viene popolata con le TFO già registrate per l'edificio selezionato (chiamata GET a `/predisposizioni/{id_edificio}/tfos`).

#### Per aggiungere una nuova TFO:
- L'utente clicca "Aggiungi TFO per Edificio Selezionato".
- Il form TFO (`formTfoContainer`) appare, pre-compilato con i dati dell'edificio.
- L'utente compila i dettagli della TFO (data, scala, piano, interno, ID operatore, codice TFO, codice ROE).
- Clicca "Salva Nuova TFO".
- `tfoForm.js` invia una richiesta POST a `/tfos` tramite `apiService.js`.
- Il backend (`crud_tfo.py`) crea un nuovo record in `verifiche_edifici`.
- Il form TFO si nasconde, la tabella TFO si aggiorna.

#### Per modificare una TFO esistente:
- L'utente seleziona una TFO dalla tabella TFO. I bottoni "Modifica TFO Selezionata" ed "Elimina TFO Selezionata" diventano attivi.
- Clicca "Modifica TFO Selezionata".
- Il form TFO appare, pre-compilato con i dati della TFO selezionata.
- L'utente modifica i campi e clicca "Aggiorna TFO".
- `tfoForm.js` invia una richiesta PUT a `/tfos/{id_tfo}`.
- Il backend (`crud_tfo.py`) aggiorna il record in `verifiche_edifici`.
- Il form TFO si nasconde, la tabella TFO si aggiorna.

#### Per eliminare una TFO:
- L'utente seleziona una TFO dalla tabella TFO.
- Clicca "Elimina TFO Selezionata".
- Un modale di conferma appare.
- Se confermato, `tfoTable.js` invia una richiesta DELETE a `/tfos/{id_tfo}`.
- Il backend (`crud_tfo.py`) elimina il record da `verifiche_edifici`.
- La tabella TFO si aggiorna.

---

# 11. Considerazioni e Possibili Miglioramenti

## Sicurezza e Autenticazione
- **Autenticazione e Autorizzazione:** Attualmente l'applicazione non implementa meccanismi di sicurezza per l'accesso e la modifica dei dati.

## Gestione Errori e Performance
- **Gestione Errori Avanzata:** Migliorare la gestione e la visualizzazione degli errori sia nel frontend che nel backend.
- **Paginazione:** Per le tabelle "Edifici Predisposti" e "TFO", implementare la paginazione se il numero di record cresce significativamente.
- **Performance Mappa:** Per un numero molto elevato di feature sulla mappa, considerare l'uso di tile vettoriali o strategie di clustering/semplificazione lato server o client.

## Funzionalità Aggiuntive
- **Ricerca e Filtri Avanzati:** Introdurre funzionalità di ricerca e filtro più potenti per le tabelle.
- **Frontend Build System:** Per progetti più grandi, integrare un sistema di build (es. Webpack, Parcel) per minificazione, bundling, transpiling ES6+, e gestione dipendenze JS.
- **Test:** Scrivere unit test e integration test per backend e frontend per garantire la stabilità e prevenire regressioni.
- **Logging:** Implementare un sistema di logging più robusto nel backend.
- **Dockerizzazione:** Creare Dockerfile e docker-compose.yml per semplificare il deployment e l'ambiente di sviluppo.
- **Documentazione API Interattiva:** Sfruttare appieno le funzionalità di FastAPI per generare una documentazione API interattiva (Swagger UI/ReDoc) più dettagliata con esempi.
- **Gestione Concorrenza:** Valutare strategie per la gestione della concorrenza se più utenti modificano gli stessi dati contemporaneamente.
- **Backup e Recovery Database:** Definire una strategia di backup per il database PostgreSQL.
- **Internazionalizzazione (i18n):** Se necessario, predisporre l'applicazione per il supporto multilingua.

## Considerazioni Architetturali
- **Microservizi:** Per applicazioni più complesse, valutare la suddivisione in microservizi specializzati.
- **Cache:** Implementare strategie di caching (Redis, Memcached) per migliorare le performance delle query più frequenti.
- **CDN:** Utilizzare una Content Delivery Network per servire assets statici in modo più efficiente.
- **Monitoraggio e Metriche:** Integrare strumenti di monitoraggio (Prometheus, Grafana) per tracciare performance e utilizzo dell'applicazione.

## Scalabilità e Deploy
- **Load Balancing:** Configurare un load balancer per distribuire il carico tra più istanze dell'applicazione.
- **Deployment Automatizzato:** Implementare pipeline CI/CD per automatizzare testing, building e deployment.
- **Database Scaling:** Considerare strategie di scaling del database (read replicas, sharding) se necessario.
- **Configurazione Ambiente:** Utilizzare variabili d'ambiente e file di configurazione separati per diversi ambienti (development, staging, production).

---