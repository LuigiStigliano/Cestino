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

# Configurazione database
DB_CONFIG = {
    'host': 'localhost',
    'database': 'aquila_gis',  # sostituisci con il nome del tuo database
    'user': 'postgres',
    'password': 'sys'           # sostituisci con la tua password
}

def create_table_if_not_exists(cursor):
    """Crea la tabella per le abitazioni del catasto (inclusa la colonna centroide) e gli indici spaziali"""
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
    data_to_insert = []
    for feature in features:
        props = feature.get('properties', {})
        geom = feature.get('geometry', {})
        geom_wkt = json.dumps(geom)

        # Calcolo del centroide come WKT
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
    geojson_file = 'aquila.geojson'  # modifica se necessario

    if not os.path.exists(geojson_file):
        print(f"❌ File {geojson_file} non trovato nella directory corrente")
        sys.exit(1)

    try:
        print("🔌 Connessione al database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Abilita PostGIS
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

        # 1) DROP TABLE all’inizio per schema pulito
        print("🗑️ Drop della tabella 'catasto_abitazioni' (se esiste)…")
        cursor.execute("DROP TABLE IF EXISTS catasto_abitazioni CASCADE;")

        # 2) Creo la tabella nuova con centroide e indici
        create_table_if_not_exists(cursor)

        # 3) Carico il GeoJSON
        print(f"📖 Caricamento file {geojson_file}…")
        geojson_data = load_geojson_file(geojson_file)
        features = geojson_data.get('features', [])
        if not features:
            print("❌ Nessuna feature trovata nel file GeoJSON")
            sys.exit(1)
        print(f"📊 Trovate {len(features)} abitazioni da inserire")

        # 4) Inserimento batch
        print("💾 Inserimento dati in corso…")
        inserted_count = insert_features(cursor, features)
        conn.commit()
        print(f"✅ Inserimento completato: {inserted_count} record inseriti")

        # 5) Statistiche finali
        cursor.execute("SELECT COUNT(*) FROM catasto_abitazioni;")
        total = cursor.fetchone()[0]
        print(f"📈 Totale record nella tabella: {total}")

        # 6) Esempio di query spaziale
        cursor.execute("""
            SELECT edifc_uso, COUNT(*) 
            FROM catasto_abitazioni 
            GROUP BY edifc_uso 
            ORDER BY COUNT(*) DESC;
        """)
        print("\n📋 Distribuzione per tipo di uso edificio:")
        for uso, cnt in cursor.fetchall():
            print(f"   {uso}: {cnt} edifici")

    except psycopg2.Error as e:
        print(f"❌ Errore database: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Errore generico: {e}")
        sys.exit(1)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("🔌 Connessione chiusa")

if __name__ == "__main__":
    main()
