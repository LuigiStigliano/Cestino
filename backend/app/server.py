from fastapi import FastAPI, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import create_engine, text
import os
import json
import decimal
from fastapi.middleware.cors import CORSMiddleware # Aggiunto
from dotenv import load_dotenv # Aggiunto

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

# Modello Pydantic per la risposta (invariato dal tuo server.py)
class Abitazione(BaseModel):
    id: int
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

@app.get("/")
def root():
    return {"message": "Server FastAPI per Mio Progetto GIS attivo!"}

@app.get("/abitazioni", response_model=List[Abitazione])
def get_abitazioni(limit: int = 10):
    """Restituisce una lista di abitazioni dal database"""
    with engine.connect() as conn:
        result = conn.execute(text(f"""
            SELECT id, objectid, edifc_uso, edifc_ty, edifc_sot, classid, edifc_nome, edifc_stat, edifc_at, scril, meta_ist, edifc_mon, shape_length, shape_area
            FROM catasto_abitazioni
            LIMIT :limit
        """), {"limit": limit})
        rows = result.fetchall() # Modificato per SQLAlchemy 2.0
        if not rows:
            raise HTTPException(status_code=404, detail="Nessuna abitazione trovata")
        # Converti Righe in dizionari prima di passarli al modello Pydantic
        return [Abitazione(**row._asdict()) for row in rows]


@app.get("/geojson") # Questo endpoint sarà usato dal frontend
def get_geojson_data( # Rinominato per chiarezza, ma l'URL rimane /geojson
    minx: Optional[float] = None, miny: Optional[float] = None, maxx: Optional[float] = None, maxy: Optional[float] = None # Resi opzionali per un caricamento iniziale
):
    """Restituisce tutte le abitazioni o quelle filtrate come FeatureCollection GeoJSON."""
    params = {}
    where_clauses = []

    if minx is not None and miny is not None and maxx is not None and maxy is not None:
        where_clauses.append("ST_Intersects(geometry, ST_MakeEnvelope(:minx, :miny, :maxx, :maxy, 4326))")
        params = {"minx": minx, "miny": miny, "maxx": maxx, "maxy": maxy}

    where_statement = ""
    if where_clauses:
        where_statement = "WHERE " + " AND ".join(where_clauses)

    # ST_AsGeoJSON(ST_Centroid(geometry)) AS centroide -- Rimosso per semplificare, il frontend può calcolarlo se necessario
    # o aggiungi il campo centroide al modello Pydantic AbitazioneGeoJSONProperties se vuoi passarlo
    query_string = f"""
        SELECT
            id, objectid, edifc_uso, edifc_ty, edifc_sot, classid, edifc_nome, edifc_stat, edifc_at, scril, meta_ist, edifc_mon, shape_length, shape_area,
            ST_AsGeoJSON(geometry) AS geometry
        FROM catasto_abitazioni
        {where_statement}
        LIMIT 2000
    """ # Aggiunto LIMIT per evitare di caricare troppi dati inizialmente

    features = []
    with engine.connect() as conn:
        result = conn.execute(text(query_string), params)
        for row_proxy in result:
            row = row_proxy._asdict() # Converti in dizionario
            geom_str = row.pop("geometry", None)
            properties = {k: float(v) if isinstance(v, decimal.Decimal) else v for k, v in row.items()}

            feature = {
                "type": "Feature",
                "geometry": json.loads(geom_str) if geom_str else None,
                "properties": properties
            }
            features.append(feature)
    return {
        "type": "FeatureCollection",
        "features": features
    }

# L'endpoint /mappa che serve mappa.html può essere rimosso se mappa.html viene aperto direttamente
# o se la sua logica viene integrata in index.html e map_logic.js

# Per avviare (dalla cartella backend/app): uvicorn server:app --reload
# o dalla cartella backend/: uvicorn app.server:app --reload