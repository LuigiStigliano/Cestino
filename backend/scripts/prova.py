#!/usr/bin/env python3
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
dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

# Configurazione database
DB_CONFIG = {
    'host': os.getenv("POSTGRES_HOST", "localhost"),
    'database': os.getenv("POSTGRES_DB", "aquila_gis"),
    'user': os.getenv("POSTGRES_USER", "postgres"),
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
    create_verifica_sql = """
    CREATE TABLE IF NOT EXISTS verifiche_edifici (
        id SERIAL PRIMARY KEY,
        id_abitazione INTEGER REFERENCES catasto_abitazioni(id),
        scala TEXT,
        piano TEXT,
        interno TEXT,
        id_operatore TEXT,
        id_tfo TEXT,
        id_roe TEXT,
        data_predisposizione_tfo DATE
    );
    """
    cursor.execute(create_table_sql)
    cursor.execute(create_index_sql)
    cursor.execute(create_verifica_sql)
    print("✓ Tabelle create/verificate con indici")

def create_trigger(cursor):
    cursor.execute("""
    CREATE OR REPLACE FUNCTION aggiorna_predisposto_fibra()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE catasto_abitazioni
      SET predisposto_fibra = TRUE
      WHERE id = NEW.id_abitazione;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    cursor.execute("""
    CREATE TRIGGER trg_aggiorna_predisposto_fibra
    AFTER INSERT ON verifiche_edifici
    FOR EACH ROW
    EXECUTE FUNCTION aggiorna_predisposto_fibra();
    """)
    print("✓ Trigger predisposto_fibra creato")

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
    for feature in features:
        props = feature.get('properties', {})
        geom = feature.get('geometry', {})
        geom_wkt = json.dumps(geom)

        cursor.execute(
            "SELECT ST_AsText(ST_Centroid(ST_GeomFromGeoJSON(%s)))",
            (geom_wkt,)
        )
        centroide_wkt = cursor.fetchone()[0]

        classid = props.get('classid')
        if classid and isinstance(classid, str) and not classid.strip():
            classid = None

        data_row = (
            props.get('OBJECTID'),
            props.get('edifc_uso'),
            props.get('edifc_ty'),
            props.get('edifc_sot'),
            classid,
            props.get('edifc_nome'),
            props.get('edifc_stat'),
            None if props.get('edifc_at') == -9999.0 else props.get('edifc_at'),
            props.get('scril'),
            props.get('meta_ist'),
            props.get('edifc_mon'),
            props.get('shape_Length'),
            props.get('shape_Area'),
            geom_wkt,
            centroide_wkt
        )
        data_to_insert.append(data_row)

    insert_sql = """
    INSERT INTO catasto_abitazioni (
        objectid, edifc_uso, edifc_ty, edifc_sot, classid,
        edifc_nome, edifc_stat, edifc_at, scril, meta_ist,
        edifc_mon, shape_length, shape_area, geometry, centroide
    ) VALUES %s
    """
    execute_values(
        cursor,
        insert_sql,
        data_to_insert,
        template="""(
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s,
            ST_GeomFromGeoJSON(%s),
            ST_GeomFromText(%s, 4326)
        )"""
    )
    return len(data_to_insert)

def main():
    geojson_file_path = os.path.join(os.path.dirname(__file__), "..", "data", "aquila.geojson")

    if not os.path.exists(geojson_file_path):
        print(f"❌ File {geojson_file_path} non trovato.")
        sys.exit(1)

    try:
        print("🔌 Connessione al database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        print("🗑️ Drop della tabella 'catasto_abitazioni'…")
        cursor.execute("DROP TABLE IF EXISTS verifiche_edifici CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS catasto_abitazioni CASCADE;")

        create_table_if_not_exists(cursor)
        create_trigger(cursor)

        print(f"📖 Caricamento file {geojson_file_path}…")
        geojson_data = load_geojson_file(geojson_file_path)
        features = geojson_data.get('features', [])
        if not features:
            print("❌ Nessuna feature trovata nel file GeoJSON")
            sys.exit(1)
        print(f"📊 Trovate {len(features)} abitazioni da inserire")

        print("💾 Inserimento dati in corso…")
        inserted_count = insert_features(cursor, features)
        conn.commit()
        print(f"✅ Inserimento completato: {inserted_count} record inseriti")

        cursor.execute("SELECT COUNT(*) FROM catasto_abitazioni;")
        total = cursor.fetchone()[0]
        print(f"📈 Totale record nella tabella: {total}")

    except psycopg2.Error as e:
        print(f"❌ Errore database: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Errore generico: {e}")
        sys.exit(1)
    finally:
        if 'cursor' in locals() and cursor is not None:
            cursor.close()
        if 'conn' in locals() and conn is not None:
            conn.close()
        print("🔌 Connessione chiusa")

if __name__ == "__main__":
    main()