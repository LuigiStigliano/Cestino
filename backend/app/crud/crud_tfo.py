from typing import List, Optional
from psycopg2.extras import RealDictCursor
from app.schemas.tfo import TfoInDB, TfoCreate
from app.db.database import json_serializable
from fastapi import HTTPException

def get_tfos_by_predisposizione_id(db_conn, predisposizione_id: int) -> List[TfoInDB]:
    query = """
        SELECT
            v.id, v.id_abitazione, v.data_predisposizione_tfo, v.scala, v.piano, v.interno,
            v.id_operatore, v.id_tfo, v.id_roe,
            c.indirizzo, c.lat, c.lon, c.codice_catastale
        FROM verifiche_edifici v
        JOIN catasto_abitazioni c ON v.id_abitazione = c.id
        WHERE v.id_abitazione = %s AND v.id_tfo IS NOT NULL;
    """
    cursor = None
    try:
        cursor = db_conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query, (predisposizione_id,))
        rows = cursor.fetchall()
        # Mappa data_predisposizione_tfo a data_predisposizione per coerenza con frontend/schema TfoInDB
        results = []
        for row_dict in rows:
            row_data = {k: json_serializable(v) for k, v in row_dict.items()}
            row_data['data_predisposizione'] = row_data.pop('data_predisposizione_tfo', None)
            results.append(TfoInDB(**row_data))
        return results
    finally:
        if cursor: cursor.close()

def create_new_tfo(db_conn, tfo_data: TfoCreate) -> TfoInDB:
    cursor = None
    try:
        cursor = db_conn.cursor(cursor_factory=RealDictCursor)
        # Verifica che l'edificio esista e sia predisposto
        cursor.execute(
            "SELECT id, indirizzo, lat, lon, codice_catastale FROM catasto_abitazioni WHERE id = %s AND predisposto_fibra = true",
            (tfo_data.id_abitazione,)
        )
        edificio = cursor.fetchone()
        if not edificio:
            raise HTTPException(status_code=404, detail=f"Edificio predisposto con ID {tfo_data.id_abitazione} non trovato o non predisposto.")

        insert_query = """
            INSERT INTO verifiche_edifici (
                id_abitazione, scala, piano, interno,
                id_operatore, id_tfo, id_roe, data_predisposizione_tfo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, id_abitazione, scala, piano, interno,
                     id_operatore, id_tfo, id_roe, data_predisposizione_tfo;
        """
        cursor.execute(insert_query, (
            tfo_data.id_abitazione, tfo_data.scala, tfo_data.piano, tfo_data.interno,
            tfo_data.id_operatore, tfo_data.id_tfo, tfo_data.id_roe, tfo_data.data_predisposizione_tfo
        ))
        new_tfo_raw = cursor.fetchone()
        if not new_tfo_raw:
            raise HTTPException(status_code=500, detail="Creazione TFO fallita, nessun record restituito.")

        # Combina i dati per la risposta
        result_data = {k: json_serializable(v) for k,v in new_tfo_raw.items()}
        result_data.update({k: json_serializable(v) for k,v in edificio.items()}) # Aggiunge info edificio
        result_data['data_predisposizione'] = result_data.pop('data_predisposizione_tfo', None)


        db_conn.commit()
        return TfoInDB(**result_data)
    except HTTPException:
        if db_conn: db_conn.rollback()
        raise
    except Exception as e:
        if db_conn: db_conn.rollback()
        print(f"Errore CRUD create_new_tfo: {e}")
        raise HTTPException(status_code=500, detail=f"Errore DB durante creazione TFO: {str(e)}")
    finally:
        if cursor: cursor.close()


def update_existing_tfo(db_conn, tfo_id: int, tfo_data: TfoCreate) -> TfoInDB:
    cursor = None
    try:
        cursor = db_conn.cursor(cursor_factory=RealDictCursor)
        update_query = """
            UPDATE verifiche_edifici SET
                data_predisposizione_tfo = %s, scala = %s, piano = %s, interno = %s,
                id_operatore = %s, id_tfo = %s, id_roe = %s, id_abitazione = %s
            WHERE id = %s
            RETURNING id, id_abitazione, scala, piano, interno,
                   id_operatore, id_tfo, id_roe, data_predisposizione_tfo;
        """
        # Nota: id_abitazione è incluso nell'update sebbene sia parte di TfoCreate,
        # assicurati che questo sia il comportamento desiderato (permettere di spostare una TFO ad altro edificio)
        # Se id_abitazione non deve cambiare con l'update, rimuovilo dalla query SET e dai parametri.
        # Al momento tfo_data.id_abitazione è usato.
        cursor.execute(update_query, (
            tfo_data.data_predisposizione_tfo, tfo_data.scala, tfo_data.piano,
            tfo_data.interno, tfo_data.id_operatore, tfo_data.id_tfo,
            tfo_data.id_roe, tfo_data.id_abitazione, tfo_id
        ))
        updated_tfo_raw = cursor.fetchone()
        if not updated_tfo_raw:
            raise HTTPException(status_code=404, detail=f"TFO ID {tfo_id} non trovata per l'aggiornamento.")

        # Recupera i dati dell'edificio (potrebbe essere cambiato se id_abitazione è aggiornato)
        cursor.execute(
            "SELECT indirizzo, lat, lon, codice_catastale FROM catasto_abitazioni WHERE id = %s",
            (updated_tfo_raw['id_abitazione'],)
        )
        edificio = cursor.fetchone()
        if not edificio: # Safety check
             raise HTTPException(status_code=404, detail=f"Edificio associato ID {updated_tfo_raw['id_abitazione']} non trovato.")


        result_data = {k: json_serializable(v) for k,v in updated_tfo_raw.items()}
        result_data.update({k: json_serializable(v) for k,v in edificio.items()})
        result_data['data_predisposizione'] = result_data.pop('data_predisposizione_tfo', None)

        db_conn.commit()
        return TfoInDB(**result_data)
    except HTTPException:
        if db_conn: db_conn.rollback()
        raise
    except Exception as e:
        if db_conn: db_conn.rollback()
        print(f"Errore CRUD update_existing_tfo: {e}")
        raise HTTPException(status_code=500, detail=f"Errore DB durante aggiornamento TFO: {str(e)}")
    finally:
        if cursor: cursor.close()

def delete_tfo_by_id(db_conn, tfo_id: int) -> bool:
    cursor = None
    try:
        cursor = db_conn.cursor()
        cursor.execute("DELETE FROM verifiche_edifici WHERE id = %s", (tfo_id,))
        deleted_count = cursor.rowcount
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"TFO ID {tfo_id} non trovata per l'eliminazione.")
        db_conn.commit()
        return True
    except HTTPException:
        if db_conn: db_conn.rollback()
        raise
    except Exception as e:
        if db_conn: db_conn.rollback()
        print(f"Errore CRUD delete_tfo_by_id: {e}")
        raise HTTPException(status_code=500, detail=f"Errore DB durante eliminazione TFO: {str(e)}")
    finally:
        if cursor: cursor.close()