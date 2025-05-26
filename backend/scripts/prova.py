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
from dotenv import load_dotenv # Aggiunto

# Carica variabili da .env che si trova due cartelle sopra (nella root di backend/)
dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

# Configurazione database da variabili d'ambiente
DB_CONFIG = {
    'host': os.getenv("POSTGRES_HOST", "localhost"),
    'database': os.getenv("POSTGRES_DB", "aquila_gis"),
    'user': os.getenv("POSTGRES_USER", "postgres"),
    'password': os.getenv("POSTGRES_PASSWORD", "sys")
}

def create_table_if_not_exists(cursor):
    """Crea la tabella per le abitazioni del catasto (inclusa la colonna centroide) e gli indici spaziali"""
    # Definizione tabella e indici invariata dal tuo prova.py
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    create_index_sql = """
    CREATE INDEX IF NOT EXISTS idx_catasto_abitazioni_geom
      ON catasto_abitazioni USING GIST (geometry);
    CREATE INDEX IF NOT EXISTS idx_catasto_abitazioni_centroide
      ON catasto_abitazioni USING GIST (centroide);
    """
    cursor.execute(create_table_sql)
    cursor.execute(create_index_sql)
    print("✓ Tabella 'catasto_abitazioni' creata/verificata con indici")

def load_geojson_file(file_path):
    """Carica il file GeoJSON"""
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
    """Inserisce le features del GeoJSON nel database e restituisce il conteggio"""
    # Logica di inserimento invariata dal tuo prova.py
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
    # Modifica percorso per aquila.geojson
    geojson_file_path = os.path.join(os.path.dirname(__file__), "..", "data", "aquila.geojson")

    if not os.path.exists(geojson_file_path):
        print(f"❌ File {geojson_file_path} non trovato.")
        sys.exit(1)

    try:
        print("🔌 Connessione al database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        print("🗑️ Drop della tabella 'catasto_abitazioni' (se esiste)…")
        cursor.execute("DROP TABLE IF EXISTS catasto_abitazioni CASCADE;")
        create_table_if_not_exists(cursor)

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

        cursor.execute("""
            SELECT edifc_uso, COUNT(*)
            FROM catasto_abitazioni
            GROUP BY edifc_uso
            ORDER BY COUNT(*) DESC;
        """)

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