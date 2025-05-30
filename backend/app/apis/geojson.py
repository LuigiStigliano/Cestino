from fastapi import APIRouter, Query, Depends, HTTPException
from typing import Any
import psycopg2 # Per il type hint della connessione

from app.crud import crud_geojson
from app.db.database import get_db_connection

router = APIRouter()

@router.get("/bbox")
def get_geojson_by_bbox_endpoint(
    west: float = Query(..., description="Longitudine ovest"),
    south: float = Query(..., description="Latitudine sud"),
    east: float = Query(..., description="Longitudine est"),
    north: float = Query(..., description="Latitudine nord"),
    zoom: int = Query(..., description="Livello di zoom"), # zoom passato ma non usato da crud_geojson
    db_conn: psycopg2.extensions.connection = Depends(get_db_connection) # type: ignore
) -> dict[str, Any]:
    """
    Restituisce le abitazioni come GeoJSON con indicazione 'predisposto_fibra'.
    Restituisce poligoni e centroidi come feature separate.
    """
    try:
        features = crud_geojson.get_features_by_bbox(
            db_conn=db_conn, west=west, south=south, east=east, north=north # zoom=zoom
        )
        return {"type": "FeatureCollection", "features": features}
    except HTTPException as e: # Rilancia le HTTPException dal CRUD
        raise e
    except Exception as e:
        # Log dell'errore originale se necessario
        print(f"Errore API /geojson/bbox: {e}")
        raise HTTPException(status_code=500, detail=f"Errore interno del server nel recupero GeoJSON: {str(e)}")
    finally:
        if db_conn:
            db_conn.close()