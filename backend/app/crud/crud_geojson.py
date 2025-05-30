from sqlalchemy import text
from fastapi import HTTPException
from app.db.database import get_table_columns, json_serializable, validate_geometry # engine non è più qui
from app.db.database import engine # Importa engine specificamente se necessario per get_table_columns
                                   # o passa una connessione/sessione.
                                   # Per ora, get_table_columns usa engine.connect() internamente.
import psycopg2.extras 

def get_features_by_bbox(
    db_conn, # Connessione Psycopg2
    west: float,
    south: float,
    east: float,
    north: float,
    # zoom: int # zoom non è usato nella query SQL corrente
):
    available_columns = get_table_columns("catasto_abitazioni")
    select_cols_list = [col for col in available_columns if col not in ["geometry", "centroide"]]
    # Aggiungi alias alla tabella per evitare ambiguità se si fa join
    select_cols_str = ", ".join([f"c.{col}" for col in select_cols_list])


    query_sql = f"""
        SELECT
            {select_cols_str},
            COALESCE(c.predisposto_fibra, false) AS predisposto_fibra,
            ST_AsGeoJSON(c.geometry, 20) AS geometry_geojson,
            ST_AsGeoJSON(c.centroide, 20) AS centroide_geojson
        FROM catasto_abitazioni c
        WHERE ST_Intersects(
            c.geometry,
            ST_MakeEnvelope(%(west)s, %(south)s, %(east)s, %(north)s, 4326)
        )
        LIMIT 3000;
    """
    params = {"west": west, "south": south, "east": east, "north": north}
    features = []
    cursor = None
    try:
        cursor = db_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) # type: ignore
        cursor.execute(query_sql, params)
        rows = cursor.fetchall()

        for row in rows:
            # props = {k: json_serializable(v) for k, v in row.items() if k not in ["geometry_geojson", "centroide_geojson"]}
            # Crea props escludendo le geometrie e assicurando serializzazione
            props = {}
            for k, v in row.items():
                if k not in ["geometry_geojson", "centroide_geojson"]:
                    props[k] = json_serializable(v)

            geom_str = row.get("geometry_geojson")
            centroide_str = row.get("centroide_geojson")

            if geom_str:
                is_valid, geom_obj = validate_geometry(geom_str)
                if is_valid:
                    feature_props = props.copy() # Props specifiche per questa feature
                    features.append({
                        "type": "Feature",
                        "geometry": geom_obj,
                        "properties": feature_props
                    })

            if centroide_str:
                is_valid_c, geom_c_obj = validate_geometry(centroide_str)
                if is_valid_c:
                    centroid_props = { # Props specifiche per il centroide
                        "is_centroid": True,
                        "parent_id": props.get("id") or props.get("objectid"), # Usa l'ID dalla feature poligono
                        "predisposto_fibra": props.get("predisposto_fibra", False) # Anche dal poligono
                    }
                    features.append({
                        "type": "Feature",
                        "geometry": geom_c_obj,
                        "properties": centroid_props
                    })
        return features
    except Exception as e:
        print(f"Errore CRUD GeoJSON BBOX: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nel recupero GeoJSON dal DB: {str(e)}")
    finally:
        if cursor:
            cursor.close()