"""
Script per caricare file GeoJSON del catasto in PostgreSQL/PostGIS
(drop & recreate table ad ogni esecuzione)
"""

import json
import psycopg2
from psycopg2.extras import execute_values
import sys
import os
from dotenv import load_dotenv

# Carica variabili da .env
# Assumendo che .env sia nella root della cartella 'backend'
dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

# Configurazione database
DB_CONFIG = {
    'host': os.getenv("POSTGRES_HOST", "localhost"),
    'database': os.getenv("POSTGRES_DB", "aquila_gis"),
    'user': os.getenv("POSTGRES_USER", "postgres"),
    'port': os.getenv("POSTGRES_PORT", "5432"),
    'password': os.getenv("POSTGRES_PASSWORD", "sys")
}

def create_table_if_not_exists(cursor):
    """Crea le tabelle principali e secondarie"""
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS catasto_abitazioni (
        id SERIAL PRIMARY KEY,
        objectid INTEGER,
        edifc_uso TEXT,
        edifc_ty TEXT,
        edifc_sot TEXT,
        classid TEXT,
        edifc_nome TEXT,
        edifc_stat TEXT,
        edifc_at NUMERIC,
        scril TEXT,
        meta_ist TEXT,
        edifc_mon TEXT,
        shape_length NUMERIC,
        shape_area NUMERIC,
        geometry GEOMETRY(MULTIPOLYGONZ, 4326),
        centroide GEOMETRY(POINT, 4326),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        predisposto_fibra BOOLEAN,
        indirizzo TEXT,
        uso_edificio TEXT,
        comune TEXT,
        codice_belfiore TEXT,
        codice_catastale TEXT,
        data_predisposizione DATE,
        lat NUMERIC,
        lon NUMERIC
    );
    """
    create_index_sql = """
    CREATE INDEX IF NOT EXISTS idx_catasto_abitazioni_geom
      ON catasto_abitazioni USING GIST (geometry);
    CREATE INDEX IF NOT EXISTS idx_catasto_abitazioni_centroide
      ON catasto_abitazioni USING GIST (centroide);
    """
    # La tabella verifiche_edifici ora si chiamerà tfo (Terminazioni Fibra Ottica)
    # o un nome più generico se serve per altre verifiche.
    # Manteniamo 'verifiche_edifici' per coerenza con il codice originale.
    create_verifica_sql = """
    CREATE TABLE IF NOT EXISTS verifiche_edifici (
        id SERIAL PRIMARY KEY,
        id_abitazione INTEGER REFERENCES catasto_abitazioni(id) ON DELETE CASCADE, -- Aggiunto ON DELETE CASCADE
        scala TEXT,
        piano TEXT,
        interno TEXT,
        id_operatore TEXT,
        id_tfo TEXT, -- Questo è il codice TFO
        id_roe TEXT, -- Questo è il codice ROE
        data_predisposizione_tfo DATE -- Data specifica per la TFO
    );
    """
    cursor.execute(create_table_sql)
    cursor.execute(create_index_sql)
    cursor.execute(create_verifica_sql)
    print("✓ Tabelle create/verificate con indici")


def create_trigger_predisposto_fibra(cursor):
    # Questo trigger non è più necessario se predisposto_fibra viene gestito dall'applicazione
    # quando si crea/aggiorna una "predisposizione" tramite l'API.
    # Il campo predisposto_fibra in catasto_abitazioni viene aggiornato direttamente dall'API /predisposizioni
    # Tuttavia, se si vuole un fallback a livello DB quando una TFO viene inserita direttamente
    # (bypassando la logica di creazione "predisposizione" dell'edificio), potrebbe ancora servire.
    # Per ora, lo commentiamo assumendo che la logica applicativa gestisca lo stato predisposto_fibra.
    
    # Controlla se la funzione esiste già
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM pg_proc
            WHERE proname = 'aggiorna_predisposto_fibra_da_tfo'
        );
    """)
    func_exists = cursor.fetchone()[0]

    if not func_exists:
        cursor.execute("""
        CREATE OR REPLACE FUNCTION aggiorna_predisposto_fibra_da_tfo()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Solo se l'edificio non è già predisposto, lo segna come tale.
          -- Questo evita di sovrascrivere una data_predisposizione già impostata
          -- manualmente tramite l'interfaccia principale di predisposizione.
          -- L'idea è che l'inserimento di una TFO implica che l'edificio è, di fatto, predisposto.
          UPDATE catasto_abitazioni
          SET 
            predisposto_fibra = TRUE
            -- Non aggiorniamo altri campi (indirizzo, data_predisposizione etc.) qui,
            -- quelli sono gestiti dal form di predisposizione principale.
          WHERE id = NEW.id_abitazione AND (predisposto_fibra IS NULL OR predisposto_fibra = FALSE);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """)
        print("✓ Funzione Trigger aggiorna_predisposto_fibra_da_tfo creata/verificata.")
    else:
        print("✓ Funzione Trigger aggiorna_predisposizone_fibra_da_tfo già esistente.")

    # Controlla se il trigger esiste già
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'trg_aggiorna_predisposto_fibra_on_tfo_insert'
        );
    """)
    trigger_exists = cursor.fetchone()[0]
    
    if not trigger_exists:
        cursor.execute("""
        CREATE TRIGGER trg_aggiorna_predisposto_fibra_on_tfo_insert
        AFTER INSERT ON verifiche_edifici
        FOR EACH ROW
        WHEN (NEW.id_tfo IS NOT NULL) -- Si attiva solo se viene inserito un codice TFO
        EXECUTE FUNCTION aggiorna_predisposto_fibra_da_tfo();
        """)
        print("✓ Trigger trg_aggiorna_predisposto_fibra_on_tfo_insert creato/verificato.")
    else:
        print("✓ Trigger trg_aggiorna_predisposto_fibra_on_tfo_insert già esistente.")


def load_geojson_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ File non trovato: {file_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Errore nel parsing JSON: {e}")
        sys.exit(1)

def insert_features(cursor, features):
    data_to_insert = []
    for feature_idx, feature in enumerate(features):
        props = feature.get('properties', {})
        geom = feature.get('geometry', {})

        if not geom or 'type' not in geom or 'coordinates' not in geom or not geom['coordinates']:
            print(f"⚠️ Feature {feature_idx} (OBJECTID: {props.get('OBJECTID', 'N/A')}) scartata: geometria mancante o invalida.")
            continue
        
        geom_wkt = json.dumps(geom) # ST_GeomFromGeoJSON si aspetta una stringa GeoJSON

        # Calcolo centroide
        try:
            cursor.execute(
                "SELECT ST_AsText(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))", # Assicura SRID
                (geom_wkt,)
            )
            centroide_wkt = cursor.fetchone()[0]
            if centroide_wkt is None: # Gestione di geometrie che potrebbero non avere un centroide calcolabile
                 print(f"⚠️ Feature {feature_idx} (OBJECTID: {props.get('OBJECTID', 'N/A')}): centroide non calcolabile, impostato a NULL.")
                 centroide_wkt = None # Esplicito None per ST_GeomFromText
        except Exception as e:
            print(f"⚠️ Errore calcolo centroide per feature {feature_idx} (OBJECTID: {props.get('OBJECTID', 'N/A')}): {e}. Centroide impostato a NULL.")
            centroide_wkt = None


        classid = props.get('classid')
        if classid and isinstance(classid, str) and not classid.strip(): # Gestisce stringa vuota
            classid = None
        
        # Gestione di edifc_at che potrebbe essere -9999.0
        edifc_at_val = props.get('edifc_at')
        if edifc_at_val == -9999.0:
            edifc_at_val = None

        data_row = (
            props.get('OBJECTID'),
            props.get('edifc_uso'),
            props.get('edifc_ty'),
            props.get('edifc_sot'),
            classid,
            props.get('edifc_nome'),
            props.get('edifc_stat'),
            edifc_at_val,
            props.get('scril'),
            props.get('meta_ist'),
            props.get('edifc_mon'),
            props.get('shape_Length'),
            props.get('shape_Area'),
            geom_wkt,
            centroide_wkt,  # For the CASE WHEN check
            centroide_wkt   # For the ST_GeomFromText function
        )
        data_to_insert.append(data_row)

    if not data_to_insert:
        print("ℹ️ Nessun dato valido da inserire.")
        return 0

    insert_sql_template = """
    INSERT INTO catasto_abitazioni (
        objectid, edifc_uso, edifc_ty, edifc_sot, classid,
        edifc_nome, edifc_stat, edifc_at, scril, meta_ist,
        edifc_mon, shape_length, shape_area, geometry, centroide
    ) VALUES (
        %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s,
        %s, %s, %s,
        ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326),
        CASE WHEN %s IS NOT NULL THEN ST_GeomFromText(%s, 4326) ELSE NULL END
    )
    """
    # Usare execute_batch per efficienza se psycopg2 è >= 2.7
    # o un loop con execute per maggiore controllo/logging per riga in caso di problemi
    
    # execute_values è buono per multiple rows, ma il template complesso per ST_GeomFromGeoJSON e ST_Centroid
    # rende più semplice un loop di execute per questo scenario specifico.
    # Tuttavia, per mantenere la struttura originale:
    
    # Il template per execute_values deve essere adattato per gestire ST_GeomFromGeoJSON
    # e il centroide WKT. ST_GeomFromGeoJSON si aspetta una stringa per ogni riga.
    
    # Dato che ST_GeomFromGeoJSON e ST_Centroid sono per riga, execute_values
    # non è l'ideale qui se le funzioni SQL sono nel template di execute_values.
    # È meglio iterare e fare execute per riga.
    
    inserted_count_actual = 0
    for row_data in data_to_insert:
        try:
            cursor.execute(insert_sql_template, row_data)
            inserted_count_actual +=1
        except psycopg2.Error as insert_err:
            print(f"❌ Errore inserimento riga (OBJECTID: {row_data[0]}): {insert_err}")
            # Decidi se fare rollback parziale o continuare
            # conn.rollback() # Esempio se vuoi fermarti al primo errore grave
            # sys.exit(1)

    return inserted_count_actual


def main():
    # Assumendo che il file aquila.geojson sia in backend/data/
    geojson_file_path = os.path.join(os.path.dirname(__file__), "..", "data", "aquila.geojson")

    if not os.path.exists(geojson_file_path):
        print(f"❌ File {geojson_file_path} non trovato.")
        print(f"Assicurati che il file sia in: {os.path.abspath(geojson_file_path)}")
        sys.exit(1)

    conn = None # Definisci conn qui per averlo nello scope del finally
    cursor = None # Definisci cursor qui
    try:
        print("🔌 Connessione al database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        print("✓ Estensione PostGIS assicurata.")

        print("🗑️ Drop delle tabelle 'verifiche_edifici' e 'catasto_abitazioni' (se esistono)...")
        cursor.execute("DROP TABLE IF EXISTS verifiche_edifici CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS catasto_abitazioni CASCADE;")
        print("✓ Tabelle droppate.")

        create_table_if_not_exists(cursor) # Crea le tabelle
        create_trigger_predisposto_fibra(cursor) # Crea il trigger
        conn.commit() # Commit dopo DDL e creazione trigger

        print(f"📖 Caricamento file {geojson_file_path}...")
        geojson_data = load_geojson_file(geojson_file_path)
        features = geojson_data.get('features', [])

        if not features:
            print("❌ Nessuna feature trovata nel file GeoJSON.")
            sys.exit(1)
        print(f"📊 Trovate {len(features)} feature nel GeoJSON.")

        print("💾 Inserimento dati in corso...")
        inserted_count = insert_features(cursor, features) # Passa la connessione per il calcolo del centroide
        conn.commit() # Commit dopo l'inserimento dei dati
        print(f"✅ Inserimento completato: {inserted_count} record inseriti in 'catasto_abitazioni'.")

        cursor.execute("SELECT COUNT(*) FROM catasto_abitazioni;")
        total = cursor.fetchone()[0]
        print(f"📈 Totale record nella tabella 'catasto_abitazioni': {total}")

    except psycopg2.Error as e:
        print(f"❌ Errore database: {e}")
        if conn:
            conn.rollback() # Rollback in caso di errore DB
        sys.exit(1)
    except Exception as e:
        print(f"❌ Errore generico: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("🔌 Connessione chiusa.")

if __name__ == "__main__":
    main()