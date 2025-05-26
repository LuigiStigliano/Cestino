#!/usr/bin/env python3
"""
Script per caricare file GeoJSON del catasto in PostgreSQL/PostGIS
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
    'password': 'sys'  # sostituisci con la tua password
}

def create_table_if_not_exists(cursor):
    """Crea la tabella per le abitazioni del catasto se non esiste"""
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    
    # Crea indice spaziale
    create_index_sql = """
    CREATE INDEX IF NOT EXISTS idx_catasto_abitazioni_geom 
    ON catasto_abitazioni USING GIST (geometry);
    """
    
    cursor.execute(create_table_sql)
    cursor.execute(create_index_sql)
    print("✓ Tabella 'catasto_abitazioni' creata/verificata")

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
    """Inserisce le features del GeoJSON nel database"""
    
    # Prepara i dati per l'inserimento
    data_to_insert = []
    
    for feature in features:
        props = feature.get('properties', {})
        geom = feature.get('geometry', {})
        
        # Converti la geometria in formato WKT
        geom_wkt = json.dumps(geom)
        
        # Gestisci stringhe vuote
        classid = props.get('classid')
        if classid and isinstance(classid, str):
            classid = classid.strip()
            if not classid:
                classid = None
        
        data_row = (
            props.get('OBJECTID'),
            props.get('edifc_uso'),
            props.get('edifc_ty'),
            props.get('edifc_sot'),
            classid,
            props.get('edifc_nome'),
            props.get('edifc_stat'),
            props.get('edifc_at') if props.get('edifc_at') != -9999.0 else None,
            props.get('scril'),
            props.get('meta_ist'),
            props.get('edifc_mon'),
            props.get('shape_Length'),
            props.get('shape_Area'),
            geom_wkt
        )
        
        data_to_insert.append(data_row)
    
    # Query di inserimento
    insert_sql = """
    INSERT INTO catasto_abitazioni (
        objectid, edifc_uso, edifc_ty, edifc_sot, classid, 
        edifc_nome, edifc_stat, edifc_at, scril, meta_ist, 
        edifc_mon, shape_length, shape_area, geometry
    ) VALUES %s
    """
    
    # Esegui l'inserimento batch
    execute_values(
        cursor, 
        insert_sql, 
        data_to_insert,
        template="""(
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
            %s, %s, %s, ST_GeomFromGeoJSON(%s)
        )"""
    )
    
    return len(data_to_insert)

def main():
    # Percorso del file GeoJSON
    geojson_file = 'aquila.geojson'  # modifica se necessario
    
    if not os.path.exists(geojson_file):
        print(f"❌ File {geojson_file} non trovato nella directory corrente")
        print("Assicurati che il file sia nella stessa cartella dello script")
        sys.exit(1)
    
    try:
        # Connessione al database
        print("🔌 Connessione al database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Abilita PostGIS se non già fatto
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        
        # Crea la tabella
        create_table_if_not_exists(cursor)
        
        # Carica il file GeoJSON
        print(f"📖 Caricamento file {geojson_file}...")
        geojson_data = load_geojson_file(geojson_file)
        
        features = geojson_data.get('features', [])
        if not features:
            print("❌ Nessuna feature trovata nel file GeoJSON")
            sys.exit(1)
        
        print(f"📊 Trovate {len(features)} abitazioni da inserire")
        
        # Svuota la tabella se esiste già (per evitare duplicati)
        print("🗑️ Pulizia tabella esistente...")
        cursor.execute("DROP TABLE IF EXISTS catasto_abitazioni CASCADE;")
        
        # Ricrea la tabella
        create_table_if_not_exists(cursor)
        
        # Inserisci i dati
        print("💾 Inserimento dati in corso...")
        inserted_count = insert_features(cursor, features)
        
        # Commit delle modifiche
        conn.commit()
        
        print(f"✅ Inserimento completato: {inserted_count} record inseriti")
        
        # Statistiche finali
        cursor.execute("SELECT COUNT(*) FROM catasto_abitazioni;")
        total_records = cursor.fetchone()[0]
        print(f"📈 Totale record nella tabella: {total_records}")
        
        # Esempio di query spaziale
        cursor.execute("""
            SELECT edifc_uso, COUNT(*) 
            FROM catasto_abitazioni 
            GROUP BY edifc_uso 
            ORDER BY COUNT(*) DESC;
        """)
        
        print("\n📋 Distribuzione per tipo di uso edificio:")
        for row in cursor.fetchall():
            print(f"   {row[0]}: {row[1]} edifici")
            
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