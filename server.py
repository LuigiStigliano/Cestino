from fastapi import FastAPI, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import create_engine, text
import os
from fastapi.responses import JSONResponse
import json
from fastapi.staticfiles import StaticFiles
import decimal

# Configurazione database (modifica se necessario)
DB_USER = "postgres"
DB_PASSWORD = "sys"
DB_HOST = "localhost"
DB_NAME = "aquila_gis"

DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

# Modello Pydantic per la risposta
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

app = FastAPI()
app.mount("/static", StaticFiles(directory="."), name="static")
engine = create_engine(DATABASE_URL)

@app.get("/abitazioni", response_model=List[Abitazione])
def get_abitazioni(limit: int = 10):
    """Restituisce una lista di abitazioni dal database"""
    with engine.connect() as conn:
        result = conn.execute(text(f"""
            SELECT id, objectid, edifc_uso, edifc_ty, edifc_sot, classid, edifc_nome, edifc_stat, edifc_at, scril, meta_ist, edifc_mon, shape_length, shape_area
            FROM catasto_abitazioni
            LIMIT :limit
        """), {"limit": limit})
        rows = result.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="Nessuna abitazione trovata")
        return [Abitazione(**row._mapping) for row in rows]

@app.get("/geojson")
def get_geojson(
    minx: float, miny: float, maxx: float, maxy: float
):
    """Restituisce tutte le abitazioni come FeatureCollection GeoJSON all'interno della bounding box"""
    where = "WHERE ST_Intersects(geometry, ST_MakeEnvelope(:minx, :miny, :maxx, :maxy, 4326))"
    params = {"minx": minx, "miny": miny, "maxx": maxx, "maxy": maxy}
    query = f"""
        SELECT 
            id, objectid, edifc_uso, edifc_ty, edifc_sot, classid, edifc_nome, edifc_stat, edifc_at, scril, meta_ist, edifc_mon, shape_length, shape_area,
            ST_AsGeoJSON(geometry) AS geometry,
            ST_AsGeoJSON(ST_Centroid(geometry)) AS centroide
        FROM catasto_abitazioni
        {where}
    """
    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        features = []
        for row in result:
            props = dict(row._mapping)
            geom = props.pop("geometry")
            centroide = props.pop("centroide")
            # Converti Decimal in float
            for k, v in props.items():
                if isinstance(v, decimal.Decimal):
                    props[k] = float(v)
            features.append({
                "type": "Feature",
                "geometry": json.loads(geom),
                "properties": {**props, "centroide": json.loads(centroide)}
            })
        return JSONResponse({
            "type": "FeatureCollection",
            "features": features
        })

@app.get("/mappa")
def serve_mappa():
    """Serve la pagina mappa.html"""
    from fastapi.responses import HTMLResponse
    with open("mappa.html", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/")
def root():
    return {"message": "Server FastAPI attivo!"}
