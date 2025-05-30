from fastapi import APIRouter, Depends, HTTPException, Path, Body
from typing import List
import psycopg2

from app.crud import crud_predisposizione
from app.schemas.predisposizioni import PredisposizioneInDB, PredisposizioneCreate
from app.schemas.common import BaseResponse
from app.db.database import get_db_connection

router = APIRouter()

@router.get("", response_model=List[PredisposizioneInDB])
def get_predisposizioni_endpoint(
    db_conn: psycopg2.extensions.connection = Depends(get_db_connection) # type: ignore
):
    try:
        return crud_predisposizione.get_all_predisposizioni(db_conn=db_conn)
    finally:
        if db_conn: db_conn.close()

@router.post("", response_model=PredisposizioneInDB, status_code=201)
def create_predisposizione_endpoint(
    pred: PredisposizioneCreate,
    db_conn: psycopg2.extensions.connection = Depends(get_db_connection) # type: ignore
):
    try:
        return crud_predisposizione.create_or_update_predisposizione(db_conn=db_conn, pred_data=pred)
    except HTTPException as e:
        raise e # Rilancia l'eccezione dal CRUD (es. 404)
    except Exception as e:
        print(f"Errore API POST /predisposizioni: {e}")
        raise HTTPException(status_code=500, detail=f"Errore durante la creazione/aggiornamento predisposizione: {str(e)}")
    finally:
        if db_conn: db_conn.close()


@router.delete("/{predisposizione_id}", response_model=BaseResponse)
def delete_predisposizione_endpoint(
    predisposizione_id: int = Path(..., description="ID abitazione (predisposizione) da eliminare"),
    db_conn: psycopg2.extensions.connection = Depends(get_db_connection) # type: ignore
):
    try:
        deleted_tfos_count = crud_predisposizione.delete_predisposizione_by_id(
            db_conn=db_conn, predisposizione_id=predisposizione_id
        )
        return BaseResponse(message=f"Predisposizione ID {predisposizione_id} e {deleted_tfos_count} TFO associate eliminate/resettate.")
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Errore API DELETE /predisposizioni/{predisposizione_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Errore durante l'eliminazione della predisposizione: {str(e)}")
    finally:
        if db_conn: db_conn.close()