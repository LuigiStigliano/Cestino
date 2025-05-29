from fastapi import FastAPI, HTTPException, Query, Path, Body
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
import os
import json
import decimal
import datetime
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi.responses import JSONResponse
import psycopg2
from psycopg2.extras import RealDictCursor

# Carica variabili da .env che si trova una cartella sopra (nella root di backend/)
dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

# Configurazione database da variabili d'ambiente
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "sys")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_NAME = os.getenv("POSTGRES_DB", "aquila_gis")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")

DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
DB_CONFIG = {
    'host': DB_HOST,
    'database': DB_NAME,
    'user': DB_USER,
    'password': DB_PASSWORD,
    'port': DB_PORT
}

engine = create_engine(DATABASE_URL)
app = FastAPI(title="Mio Progetto GIS Backend - API Edifici e TFO")

# Configurazione CORS
origins = [
    "http://localhost",
    "http://127.0.0.1",
    "null", # Necessario se apri frontend/index.html direttamente come file
    "http://localhost:8000", # Aggiungi se usi un live server per il frontend
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Funzioni Utilità ---

def get_db_connection():
    """Restituisce una connessione psycopg2."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
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

def get_table_columns(table_name):
    """Ottiene le colonne effettive della tabella."""
    query = f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'"
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return [row[0] for row in result]

# --- Modelli Pydantic ---

class BaseResponse(BaseModel):
    status: str = "success"
    message: Optional[str] = None

class PredisposizioneBase(BaseModel):
    id: int  # ID della tabella catasto_abitazioni
    indirizzo: Optional[str] = None
    comune: Optional[str] = None
    codice_catastale: Optional[str] = None
    data_predisposizione: Optional[datetime.date] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    uso_edificio: Optional[str] = None
    codice_belfiore: Optional[str] = None
    predisposto_fibra: Optional[bool] = None

class PredisposizioneInDB(PredisposizioneBase):
    pass

class TfoBase(BaseModel):
    id_abitazione: int
    data_predisposizione_tfo: Optional[datetime.date] = None
    scala: Optional[str] = None
    piano: Optional[str] = None
    interno: Optional[str] = None
    id_operatore: Optional[str] = None
    id_tfo: Optional[str] = None
    id_roe: Optional[str] = None

class TfoCreate(TfoBase):
    pass

class TfoInDB(TfoBase):
    id: int  # ID univoco della tabella verifiche_edifici
    # Questi campi vengono recuperati dalla tabella catasto_abitazioni
    indirizzo: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    codice_catastale: Optional[str] = None

class PredisposizioneCreate(BaseModel):
    id: int  # Questo è l'id della tabella catasto_abitazioni
    indirizzo: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    uso_edificio: Optional[str] = None
    comune: str
    codice_belfiore: Optional[str] = None
    codice_catastale: Optional[str] = None
    data_predisposizione: datetime.date

# --- Endpoint Radice ---

@app.get("/")
def root():
    return {"message": "Server FastAPI per Mio Progetto GIS attivo!"}

# --- Endpoint GeoJSON ---

@app.get("/geojson/bbox")
def get_geojson_by_bbox(
    west: float = Query(..., description="Longitudine ovest"),
    south: float = Query(..., description="Latitudine sud"),
    east: float = Query(..., description="Longitudine est"),
    north: float = Query(..., description="Latitudine nord"),
    zoom: int = Query(..., description="Livello di zoom"),
):
    """
    Restituisce le abitazioni come GeoJSON con indicazione 'predisposto_fibra'.
    Restituisce poligoni e centroidi come feature separate.
    """
    # Ottieni colonne effettive per evitare errori se mancano
    available_columns = get_table_columns("catasto_abitazioni")
    select_cols = [f"c.{col}" for col in available_columns if col not in ["geometry", "centroide"]]
    select_statement = ", ".join(select_cols)

    query = f"""
        SELECT
            {select_statement},
            COALESCE(c.predisposto_fibra, false) AS predisposto_fibra, -- *** AGGIUNTO CAMPO con COALESCE ***
            ST_AsGeoJSON(c.geometry, 20) AS geometry,
            ST_AsGeoJSON(c.centroide, 20) AS centroide_geojson
        FROM catasto_abitazioni c
        WHERE ST_Intersects(
            c.geometry,
            ST_MakeEnvelope(:west, :south, :east, :north, 4326)
        )
        LIMIT 3000; -- Limite per evitare sovraccarichi
    """
    params = {"west": west, "south": south, "east": east, "north": north}
    features = []

    try:
        with engine.connect() as conn:
            result = conn.execute(text(query), params)
            for row_proxy in result:
                row = row_proxy._mapping
                props = {k: json_serializable(v) for k, v in row.items() if k not in ["geometry", "centroide_geojson"]}
                geom_str = row.get("geometry")
                centroide_str = row.get("centroide_geojson")

                # Aggiungi poligono
                if geom_str:
                    is_valid, geom = validate_geometry(geom_str)
                    if is_valid:
                        features.append({
                            "type": "Feature",
                            "geometry": geom,
                            "properties": props.copy()
                        })

                # Aggiungi centroide
                if centroide_str:
                    is_valid_c, geom_c = validate_geometry(centroide_str)
                    if is_valid_c:
                         features.append({
                            "type": "Feature",
                            "geometry": geom_c,
                            "properties": {
                                "is_centroid": True,
                                "parent_id": props.get("id") or props.get("objectid"),
                                "predisposto_fibra": props.get("predisposto_fibra")
                            }
                        })
    except Exception as e:
        print(f"Errore GeoJSON BBOX: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nel recupero GeoJSON: {e}")

    return {"type": "FeatureCollection", "features": features}

# --- Endpoint Predisposizioni ---

@app.get("/predisposizioni", response_model=List[PredisposizioneInDB])
def get_predisposizioni():
    """Restituisce tutte le predisposizioni registrate (una per edificio)."""
    query = """
        SELECT 
            c.id, c.indirizzo, c.comune, c.codice_catastale, c.data_predisposizione,
            c.lat, c.lon, c.uso_edificio, c.codice_belfiore, c.predisposto_fibra
        FROM catasto_abitazioni c
        WHERE c.predisposto_fibra = true
        ORDER BY c.id ASC;
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query)
        rows = cursor.fetchall()
        return [PredisposizioneInDB(**{k: json_serializable(v) for k, v in row.items()}) for row in rows]
    except Exception as e:
        print(f"Errore GET /predisposizioni: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nel recupero delle predisposizioni: {e}")
    finally:
        if conn: conn.close()

@app.post("/predisposizioni", response_model=PredisposizioneInDB, status_code=201)
def create_predisposizione(pred: PredisposizioneCreate):
    """Crea una nuova predisposizione o aggiorna quella esistente."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT id FROM catasto_abitazioni WHERE id = %s", (pred.id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail=f"Edificio con ID {pred.id} non trovato")

        # Aggiorna direttamente la tabella catasto_abitazioni con i dati anagrafici
        update_query = """
            UPDATE catasto_abitazioni SET
                predisposto_fibra = true, 
                indirizzo = %s, 
                lat = %s, 
                lon = %s,
                uso_edificio = %s, 
                comune = %s, 
                codice_belfiore = %s,
                codice_catastale = %s, 
                data_predisposizione = %s
            WHERE id = %s 
            RETURNING id, indirizzo, lat, lon, uso_edificio, comune, 
                     codice_belfiore, codice_catastale, data_predisposizione, predisposto_fibra;
        """
        cursor.execute(update_query, (
            pred.indirizzo, pred.lat, pred.lon, pred.uso_edificio, pred.comune,
            pred.codice_belfiore, pred.codice_catastale, pred.data_predisposizione,
            pred.id
        ))

        updated_record = cursor.fetchone()
        conn.commit()
        return PredisposizioneInDB(**{k: json_serializable(v) for k, v in updated_record.items()})

    except HTTPException:
        if conn: conn.rollback()
        raise
    except Exception as e:
        if conn: conn.rollback()
        print(f"Errore POST /predisposizioni: {e}")
        raise HTTPException(status_code=500, detail=f"Errore durante la creazione/aggiornamento: {e}")
    finally:
        if conn: conn.close()

@app.delete("/predisposizioni/{predisposizione_id}", response_model=BaseResponse)
def delete_predisposizione(predisposizione_id: int = Path(..., description="ID abitazione")):
    """Elimina una predisposizione e tutte le TFO associate."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Prima elimina tutte le TFO associate
        cursor.execute("DELETE FROM verifiche_edifici WHERE id_abitazione = %s", (predisposizione_id,))
        deleted_count = cursor.rowcount
        
        # Poi resetta lo stato di predisposizione nell'edificio
        cursor.execute("""
            UPDATE catasto_abitazioni SET 
                predisposto_fibra = NULL,
                indirizzo = NULL,
                comune = NULL,
                codice_catastale = NULL,
                data_predisposizione = NULL,
                lat = NULL,
                lon = NULL,
                uso_edificio = NULL,
                codice_belfiore = NULL
            WHERE id = %s
            RETURNING id
        """, (predisposizione_id,))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"Nessuna predisposizione trovata per ID {predisposizione_id}")
            
        conn.commit()
        return BaseResponse(message=f"Predisposizione e {deleted_count} TFO associate eliminate per ID {predisposizione_id}")
    except HTTPException:
        if conn: conn.rollback()
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Errore durante l'eliminazione: {e}")
    finally:
        if conn: conn.close()

# --- Endpoint TFO ---

@app.get("/predisposizioni/{predisposizione_id}/tfos", response_model=List[TfoInDB])
def get_tfos_for_predisposizione(predisposizione_id: int = Path(..., description="ID abitazione")):
    """Restituisce tutte le TFO per un edificio."""
    query = """
        SELECT v.id, v.id_abitazione, v.data_predisposizione_tfo as data_predisposizione, v.scala, v.piano, v.interno,
               v.id_operatore, v.id_tfo, v.id_roe, 
               c.indirizzo, c.lat, c.lon, c.codice_catastale
        FROM verifiche_edifici v
        JOIN catasto_abitazioni c ON v.id_abitazione = c.id
        WHERE v.id_abitazione = %s AND v.id_tfo IS NOT NULL;
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query, (predisposizione_id,))
        rows = cursor.fetchall()
        return [TfoInDB(**{k: json_serializable(v) for k, v in row.items()}) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore recupero TFO: {e}")
    finally:
        if conn: conn.close()

@app.post("/tfos", response_model=TfoInDB, status_code=201)
def create_tfo(tfo: TfoCreate):
    """Crea una nuova TFO."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verifica che l'edificio esista e sia predisposto
        cursor.execute("SELECT id, indirizzo, lat, lon, codice_catastale FROM catasto_abitazioni WHERE id = %s AND predisposto_fibra = true", (tfo.id_abitazione,))
        edificio = cursor.fetchone()
        if not edificio:
            raise HTTPException(status_code=404, detail=f"Edificio predisposto con ID {tfo.id_abitazione} non trovato")

        # Inserisci la nuova TFO
        insert_query = """
            INSERT INTO verifiche_edifici (
                id_abitazione, scala, piano, interno, 
                id_operatore, id_tfo, id_roe, data_predisposizione_tfo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, id_abitazione, scala, piano, interno, 
                     id_operatore, id_tfo, id_roe, data_predisposizione_tfo;
        """
        cursor.execute(insert_query, (
            tfo.id_abitazione, tfo.scala, tfo.piano, tfo.interno,
            tfo.id_operatore, tfo.id_tfo, tfo.id_roe, tfo.data_predisposizione_tfo
        ))
        new_tfo = cursor.fetchone()
        
        # Combina i dati della TFO con i dati dell'edificio per la risposta
        result = dict(new_tfo)
        result['indirizzo'] = edificio['indirizzo']
        result['lat'] = edificio['lat']
        result['lon'] = edificio['lon']
        result['codice_catastale'] = edificio['codice_catastale']
        result['data_predisposizione'] = result.pop('data_predisposizione_tfo', None)
        
        conn.commit()
        return TfoInDB(**{k: json_serializable(v) for k, v in result.items()})
    except HTTPException:
        if conn: conn.rollback()
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Errore creazione TFO: {e}")
    finally:
        if conn: conn.close()

@app.put("/tfos/{tfo_id}", response_model=TfoInDB)
def update_tfo(tfo_id: int = Path(..., description="ID TFO"), tfo_data: TfoCreate = Body(...)):
    """Aggiorna una TFO esistente."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Aggiorna solo i campi della TFO
        update_query = """
            UPDATE verifiche_edifici SET
                data_predisposizione_tfo = %s, scala = %s, piano = %s, interno = %s,
                id_operatore = %s, id_tfo = %s, id_roe = %s
            WHERE id = %s RETURNING id, id_abitazione, scala, piano, interno, 
                   id_operatore, id_tfo, id_roe, data_predisposizione_tfo;
        """
        cursor.execute(update_query, (
            tfo_data.data_predisposizione_tfo, tfo_data.scala, tfo_data.piano,
            tfo_data.interno, tfo_data.id_operatore, tfo_data.id_tfo,
            tfo_data.id_roe, tfo_id
        ))
        updated_tfo = cursor.fetchone()
        if not updated_tfo:
            raise HTTPException(status_code=404, detail=f"TFO ID {tfo_id} non trovata.")
            
        # Recupera i dati dell'edificio per completare la risposta
        cursor.execute("""
            SELECT indirizzo, lat, lon, codice_catastale 
            FROM catasto_abitazioni 
            WHERE id = %s
        """, (updated_tfo['id_abitazione'],))
        edificio = cursor.fetchone()
        
        # Combina i dati per la risposta
        result = dict(updated_tfo)
        result['indirizzo'] = edificio['indirizzo']
        result['lat'] = edificio['lat']
        result['lon'] = edificio['lon']
        result['codice_catastale'] = edificio['codice_catastale']
        result['data_predisposizione'] = result.pop('data_predisposizione_tfo', None)
        
        conn.commit()
        return TfoInDB(**{k: json_serializable(v) for k, v in result.items()})
    except HTTPException:
        if conn: conn.rollback()
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Errore aggiornamento TFO: {e}")
    finally:
        if conn: conn.close()

@app.delete("/tfos/{tfo_id}", response_model=BaseResponse)
def delete_tfo(tfo_id: int = Path(..., description="ID TFO")):
    """Elimina una TFO."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM verifiche_edifici WHERE id = %s", (tfo_id,))
        deleted_count = cursor.rowcount
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"TFO ID {tfo_id} non trovata.")
        conn.commit()
        return BaseResponse(message=f"TFO ID {tfo_id} eliminata.")
    except HTTPException:
        if conn: conn.rollback()
        raise
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Errore eliminazione TFO: {e}")
    finally:
        if conn: conn.close()