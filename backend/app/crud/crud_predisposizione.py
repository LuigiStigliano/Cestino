from typing import List, Optional
from psycopg2.extras import RealDictCursor
from app.schemas.predisposizioni import PredisposizioneInDB, PredisposizioneCreate
from app.db.database import json_serializable
from fastapi import HTTPException

def get_all_predisposizioni(db_conn) -> List[PredisposizioneInDB]:
    query = """
        SELECT
            c.id, c.indirizzo, c.comune, c.codice_catastale, c.data_predisposizione,
            c.lat, c.lon, c.uso_edificio, c.codice_belfiore, c.predisposto_fibra
        FROM catasto_abitazioni c
        WHERE c.predisposto_fibra = true
        ORDER BY c.id ASC;
    """
    cursor = None
    try:
        cursor = db_conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query)
        rows = cursor.fetchall()
        return [PredisposizioneInDB(**{k: json_serializable(v) for k, v in row.items()}) for row in rows]
    finally:
        if cursor: cursor.close()

def create_or_update_predisposizione(db_conn, pred_data: PredisposizioneCreate) -> PredisposizioneInDB:
    cursor = None
    try:
        cursor = db_conn.cursor(cursor_factory=RealDictCursor)
        # Verifica se l'edificio esiste
        cursor.execute("SELECT id FROM catasto_abitazioni WHERE id = %s", (pred_data.id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail=f"Edificio con ID {pred_data.id} non trovato.")

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
            pred_data.indirizzo, pred_data.lat, pred_data.lon, pred_data.uso_edificio,
            pred_data.comune, pred_data.codice_belfiore, pred_data.codice_catastale,
            pred_data.data_predisposizione, pred_data.id
        ))
        updated_record = cursor.fetchone()
        if not updated_record: # Non dovrebbe succedere se il check iniziale passa
            raise HTTPException(status_code=500, detail="Aggiornamento fallito dopo il check.")
        
        db_conn.commit()
        return PredisposizioneInDB(**{k: json_serializable(v) for k, v in updated_record.items()})
    except HTTPException:
        if db_conn: db_conn.rollback()
        raise
    except Exception as e:
        if db_conn: db_conn.rollback()
        print(f"Errore CRUD create_or_update_predisposizione: {e}")
        raise HTTPException(status_code=500, detail=f"Errore DB durante creazione/aggiornamento predisposizione: {str(e)}")
    finally:
        if cursor: cursor.close()

def delete_predisposizione_by_id(db_conn, predisposizione_id: int) -> int:
    cursor = None
    try:
        cursor = db_conn.cursor()
        # Prima elimina tutte le TFO associate
        cursor.execute("DELETE FROM verifiche_edifici WHERE id_abitazione = %s", (predisposizione_id,))
        deleted_tfos_count = cursor.rowcount

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
            RETURNING id;
        """, (predisposizione_id,))

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"Nessuna predisposizione trovata per ID edificio {predisposizione_id} da resettare.")

        db_conn.commit()
        return deleted_tfos_count
    except HTTPException:
        if db_conn: db_conn.rollback()
        raise
    except Exception as e:
        if db_conn: db_conn.rollback()
        print(f"Errore CRUD delete_predisposizione_by_id: {e}")
        raise HTTPException(status_code=500, detail=f"Errore DB durante l'eliminazione della predisposizione: {str(e)}")
    finally:
        if cursor: cursor.close()