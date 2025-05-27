from fastapi import FastAPI, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import create_engine, text
import os
import json
import decimal
import datetime
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi.responses import JSONResponse

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

# Modello Pydantic per la risposta
class Abitazione(BaseModel):
    objectid: Optional[int]
    edifc_uso: Optional[str]
    edifc_ty: Optional[str]
    edifc_sot: Optional[str]
    classid: Optional[str]
    edifc_nome: Optional[str]
    edifc_stat: Optional[str]
    edifc_at: Optional[float]
    scril: Optional[str]
    meta_ist: Optional[str]
    edifc_mon: Optional[str]
    shape_length: Optional[float]
    shape_area: Optional[float]
    # geometry non serializzata qui per semplicità

app = FastAPI(title="Mio Progetto GIS Backend")

# Configurazione CORS
origins = [
    "http://localhost",
    "http://127.0.0.1",
    "null", # Necessario se apri frontend/index.html direttamente come file
    # Aggiungi altre origini se necessario, es. http://localhost:xxxx se usi un live server per il frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = create_engine(DATABASE_URL)

# Funzione per ottenere le colonne effettive della tabella
def get_table_columns(table_name):
    query = f"""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = '{table_name}'
    """
    with engine.connect() as conn:
        result = conn.execute(text(query))
        columns = [row[0] for row in result]
        print(f"Colonne disponibili nella tabella {table_name}: {columns}")
        return columns

# Funzione di utilità per convertire valori in formati JSON-compatibili
def json_serializable(value):
    if isinstance(value, decimal.Decimal):
        return float(value)
    elif isinstance(value, datetime.datetime):
        return value.isoformat()
    elif isinstance(value, datetime.date):
        return value.isoformat()
    return value

# Funzione per validare le geometrie GeoJSON
def validate_geometry(geom_json):
    try:
        if isinstance(geom_json, str):
            geom = json.loads(geom_json)
        else:
            geom = geom_json
            
        if not geom or "type" not in geom or "coordinates" not in geom:
            return False, "Geometria incompleta"
        
        # Verifica che le coordinate siano numeri validi
        if geom["type"] == "Point":
            if not all(isinstance(c, (int, float)) for c in geom["coordinates"]):
                return False, "Coordinate non valide"
        
        return True, geom
    except Exception as e:
        return False, str(e)

@app.get("/")
def root():
    return {"message": "Server FastAPI per Mio Progetto GIS attivo!"}

@app.get("/abitazioni", response_model=List[Abitazione])
def get_abitazioni(limit: int = 10):
    """Restituisce una lista di abitazioni dal database"""
    # Ottieni le colonne effettive della tabella
    columns = get_table_columns("catasto_abitazioni")
    
    # Costruisci la query dinamicamente in base alle colonne disponibili
    select_columns = ", ".join([col for col in columns if col != "geometry"])
    
    with engine.connect() as conn:
        query = f"""
            SELECT {select_columns}
            FROM catasto_abitazioni
            LIMIT :limit
        """
        result = conn.execute(text(query), {"limit": limit})
        rows = result.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="Nessuna abitazione trovata")
        
        # Converti Righe in dizionari prima di passarli al modello Pydantic
        # Converti anche i valori datetime in stringhe ISO
        processed_rows = []
        for row in rows:
            row_dict = {k: json_serializable(v) for k, v in row._mapping.items() if k in Abitazione.__annotations__}
            processed_rows.append(Abitazione(**row_dict))
        
        return processed_rows

@app.get("/geojson")
def get_geojson_data(
    minx: Optional[float] = None, miny: Optional[float] = None, maxx: Optional[float] = None, maxy: Optional[float] = None
):
    """Restituisce tutte le abitazioni o quelle filtrate come FeatureCollection GeoJSON."""
    # Ottieni le colonne effettive della tabella
    columns = get_table_columns("catasto_abitazioni")
    
    # Costruisci la query dinamicamente in base alle colonne disponibili
    select_columns = ", ".join([col for col in columns if col != "geometry"])
    
    params = {}
    where_clauses = []

    if minx is not None and miny is not None and maxx is not None and maxy is not None:
        where_clauses.append("ST_Intersects(geometry, ST_MakeEnvelope(:minx, :miny, :maxx, :maxy, 4326))")
        params = {"minx": minx, "miny": miny, "maxx": maxx, "maxy": maxy}

    where_statement = ""
    if where_clauses:
        where_statement = "WHERE " + " AND ".join(where_clauses)

    # Ottieni il SRID originale dei dati
    srid_query = "SELECT ST_SRID(geometry) FROM catasto_abitazioni LIMIT 1"
    with engine.connect() as conn:
        srid_result = conn.execute(text(srid_query))
        original_srid = srid_result.scalar()
    
    # Costruisci la query in base al SRID originale
    if original_srid != 4326:
        geometry_expr = "ST_AsGeoJSON(ST_Transform(geometry, 4326), 20) AS geometry"
    else:
        geometry_expr = "ST_AsGeoJSON(geometry, 20) AS geometry"
    
    query_string = f"""
        SELECT
            {select_columns},
            {geometry_expr}
        FROM catasto_abitazioni
        {where_statement}
        LIMIT 2000
    """

    features = []
    with engine.connect() as conn:
        result = conn.execute(text(query_string), params)
        for row_proxy in result:
            row = row_proxy._mapping
            geom_str = row.get("geometry")
            
            # Crea una copia del dizionario senza la geometria
            properties = {k: v for k, v in row.items() if k != "geometry"}
            
            # Converti tutti i valori in formati JSON-compatibili
            properties = {k: json_serializable(v) for k, v in properties.items()}

            # Valida la geometria prima di includerla
            if geom_str:
                is_valid, geom_result = validate_geometry(geom_str)
                if is_valid:
                    feature = {
                        "type": "Feature",
                        "geometry": geom_result,
                        "properties": properties
                    }
                    features.append(feature)
                else:
                    print(f"Geometria non valida per ID {properties.get('objectid')}: {geom_result}")
            
    return {
        "type": "FeatureCollection",
        "features": features
    }

@app.get("/geojson/bbox")
def get_geojson_by_bbox(
    west: float = Query(..., description="Longitudine ovest del bounding box"),
    south: float = Query(..., description="Latitudine sud del bounding box"),
    east: float = Query(..., description="Longitudine est del bounding box"),
    north: float = Query(..., description="Latitudine nord del bounding box"),
    zoom: int = Query(..., description="Livello di zoom corrente"),
    geometry_type: str = Query("both", description="Tipo di geometria da restituire: 'both', 'centroid', 'polygon'")
):
    """
    Restituisce le abitazioni come FeatureCollection GeoJSON 
    filtrate per bounding box e livello di zoom
    """
    # Ottieni le colonne effettive della tabella
    columns = get_table_columns("catasto_abitazioni")
    
    # Costruisci la query dinamicamente in base alle colonne disponibili
    select_columns = ", ".join([col for col in columns if col != "geometry" and col != "centroide"])
    
    # Ottieni il SRID originale dei dati
    try:
        with engine.connect() as conn:
            srid_result = conn.execute(text("SELECT ST_SRID(geometry) FROM catasto_abitazioni LIMIT 1"))
            original_srid = srid_result.scalar()
            print(f"SRID originale dei dati: {original_srid}")
    except Exception as e:
        print(f"Errore nel recupero del SRID: {str(e)}")
        original_srid = 4326  # Valore predefinito in caso di errore
    
    # Costruisci la query in base al SRID originale
    base_query = f"""
        SELECT 
            {select_columns}
    """
    
    # Gestione delle geometrie senza semplificazione e con massima precisione
    if geometry_type == "centroid":
        # Utilizziamo la colonna centroide se esiste, altrimenti calcoliamo il centroide dalla geometria
        base_query += """
            ,\n            CASE 
                WHEN centroide IS NOT NULL THEN ST_AsGeoJSON(centroide, 20)
                ELSE ST_AsGeoJSON(ST_Centroid(geometry), 20) 
            END AS geometry
        """
    elif geometry_type == "polygon":
        if original_srid != 4326:
            base_query += ",\n            ST_AsGeoJSON(ST_Transform(geometry, 4326), 20) AS geometry"
        else:
            base_query += ",\n            ST_AsGeoJSON(geometry, 20) AS geometry"
    elif geometry_type == "both":
        # Per "both", restituiamo sia la geometria completa che il centroide
        if original_srid != 4326:
            base_query += """
                ,\n            ST_AsGeoJSON(ST_Transform(geometry, 4326), 20) AS geometry
                ,\n            CASE 
                    WHEN centroide IS NOT NULL THEN ST_AsGeoJSON(centroide, 20)
                    ELSE ST_AsGeoJSON(ST_Centroid(ST_Transform(geometry, 4326)), 20) 
                END AS centroide_geojson
            """
        else:
            base_query += """
                ,\n            ST_AsGeoJSON(geometry, 20) AS geometry
                ,\n            CASE 
                    WHEN centroide IS NOT NULL THEN ST_AsGeoJSON(centroide, 20)
                    ELSE ST_AsGeoJSON(ST_Centroid(geometry), 20) 
                END AS centroide_geojson
            """
    
    # Costruisci la clausola WHERE con la corretta trasformazione del bounding box
    if original_srid != 4326:
        where_clause = """
            FROM catasto_abitazioni
            WHERE 
                ST_Intersects(
                    geometry, 
                    ST_Transform(
                        ST_MakeEnvelope(:west, :south, :east, :north, 4326),
                        :original_srid
                    )
                )
        """
    else:
        where_clause = """
            FROM catasto_abitazioni
            WHERE 
                ST_Intersects(
                    geometry, 
                    ST_MakeEnvelope(:west, :south, :east, :north, 4326)
                )
        """
    
    query = base_query + where_clause
    
    params = {
        "west": west,
        "south": south,
        "east": east,
        "north": north,
        "original_srid": original_srid
    }
    
    features = []
    with engine.connect() as conn:
        try:
            result = conn.execute(text(query), params)
            for row in result:
                props = dict(row._mapping)
                
                # Converti tutti i valori in formati JSON-compatibili
                for k, v in list(props.items()):
                    props[k] = json_serializable(v)
                
                if geometry_type == "both":
                    geom = props.pop("geometry", None)
                    centroide_geojson = props.pop("centroide_geojson", None)
                    
                    # Valida e aggiungi la geometria del poligono
                    if geom:
                        is_valid, geom_result = validate_geometry(geom)
                        if is_valid:
                            # Aggiungi il centroide come proprietà
                            if centroide_geojson:
                                is_valid_centroid, centroid_result = validate_geometry(centroide_geojson)
                                if is_valid_centroid:
                                    props["centroid"] = centroid_result
                            
                            features.append({
                                "type": "Feature",
                                "geometry": geom_result,
                                "properties": props
                            })
                            
                            # Aggiungi anche il centroide come feature separata
                            if centroide_geojson:
                                is_valid_centroid, centroid_result = validate_geometry(centroide_geojson)
                                if is_valid_centroid:
                                    centroid_props = {
                                        "is_centroid": True,
                                        "parent_id": props.get("objectid") or props.get("id"),
                                        "parent_name": props.get("edifc_nome", "")
                                    }
                                    features.append({
                                        "type": "Feature",
                                        "geometry": centroid_result,
                                        "properties": centroid_props
                                    })
                        else:
                            print(f"Geometria non valida per objectid {props.get('objectid')}: {geom_result}")
                else:
                    geom = props.pop("geometry", None)
                    if geom:
                        is_valid, geom_result = validate_geometry(geom)
                        if is_valid:
                            features.append({
                                "type": "Feature",
                                "geometry": geom_result,
                                "properties": props
                            })
                        else:
                            print(f"Geometria non valida per objectid {props.get('objectid')}: {geom_result}")
            
            return JSONResponse({
                "type": "FeatureCollection",
                "features": features
            })
        except Exception as e:
            # Gestione migliorata degli errori
            error_detail = str(e)
            print(f"Errore nell'esecuzione della query: {error_detail}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Errore nel recupero dei dati",
                    "detail": error_detail,
                    "type": "database_error"
                }
            )

# ⚠️ AGGIUNTA: modello per il form da frontend
class VerificaEdificio(BaseModel):
    id_edificio: int
    predisposto_fibra: bool
    note: str | None = None
    operatore: str

# ⚠️ AGGIUNTA: configurazione DB anche per psycopg2
import psycopg2
DB_CONFIG = {
    'host': DB_HOST,
    'database': DB_NAME,
    'user': DB_USER,
    'password': DB_PASSWORD,
    'port': DB_PORT
}

# ⚠️ AGGIUNTA: endpoint POST per inserimento verifica
@app.post("/verifica")
def inserisci_verifica(verifica: VerificaEdificio):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO verifiche_edifici (id_edificio, predisposto_fibra, note, operatore)
            VALUES (%s, %s, %s, %s)
        """, (
            verifica.id_edificio,
            verifica.predisposto_fibra,
            verifica.note,
            verifica.operatore
        ))
        conn.commit()
        return {"status": "success", "message": "Verifica salvata con successo"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore: {e}")
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
        
# Per avviare (dalla cartella backend/app): uvicorn server:app --reload
# o dalla cartella backend/: uvicorn app.server:app --reload
