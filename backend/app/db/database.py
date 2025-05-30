from sqlalchemy import create_engine
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException
from app.core.config import settings
import decimal
import datetime
import json
from sqlalchemy import text

engine = create_engine(settings.DATABASE_URL)

def get_db_connection():
    """Restituisce una connessione psycopg2."""
    try:
        conn = psycopg2.connect(**settings.DB_CONFIG_PSYCOPG2)
        return conn
    except psycopg2.Error as e:
        print(f"Errore di connessione al database: {e}")
        raise HTTPException(status_code=500, detail="Errore di connessione al database")

def json_serializable(value):
    """Converte tipi non serializzabili."""
    if isinstance(value, (decimal.Decimal, float)):
        return float(value) if value is not None else None
    elif isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat() if value is not None else None
    return value

def validate_geometry(geom_json):
    """Valida la geometria GeoJSON."""
    try:
        if isinstance(geom_json, str):
            geom = json.loads(geom_json)
        else:
            geom = geom_json
        if not geom or "type" not in geom or "coordinates" not in geom:
            return False, "Geometria incompleta"
        return True, geom
    except Exception as e:
        return False, str(e)

def get_table_columns(table_name: str):
    """Ottiene le colonne effettive della tabella."""
    query = f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'"
    # Utilizzo di una connessione diretta engine.connect() per questa utility
    # In un'applicazione reale, potresti voler passare una sessione/connessione
    with engine.connect() as conn: # type: ignore
        result = conn.execute(text(query)) # type: ignore # sqlalchemy.text
        return [row[0] for row in result]