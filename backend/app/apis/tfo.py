from fastapi import APIRouter, Depends, HTTPException, Path, Body
from typing import List
import psycopg2

from app.crud import crud_tfo
from app.schemas.tfo import TfoInDB, TfoCreate
from app.schemas.common import BaseResponse
from app.db.database import get_db_connection

router = APIRouter()

@router.get("/predisposizioni/{predisposizione_id}/tfos", response_model=List[TfoInDB])
def get_tfos_for_predisposizione_endpoint(
    predisposizione_id: int = Path(..., description="ID abitazione (predisposizione)"),
    db_conn: psycopg2.extensions.connection = Depends(get_db_connection) # type: ignore
):
    """Restituisce tutte le TFO per un edificio predisposto."""
    try:
        return crud_tfo.get_tfos_by_predisposizione_id(db_conn=db_conn, predisposizione_id=predisposizione_id)
    finally:
        if db_conn: db_conn.close()

@router.post("", response_model=TfoInDB, status_code=201) # Endpoint è /tfos
def create_tfo_endpoint(
    tfo: TfoCreate,
    db_conn: psycopg2.extensions.connection = Depends(get_db_connection) # type: ignore
):
    try:
        return crud_tfo.create_new_tfo(db_conn=db_conn, tfo_data=tfo)
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Errore API POST /tfos: {e}")
        raise HTTPException(status_code=500, detail=f"Errore durante la creazione TFO: {str(e)}")
    finally:
        if db_conn: db_conn.close()

@router.put("/{tfo_id}", response_model=TfoInDB)
def update_tfo_endpoint(
    tfo_id: int = Path(..., description="ID TFO da aggiornare"),
    tfo_data: TfoCreate = Body(...),
    db_conn: psycopg2.extensions.connection = Depends(get_db_connection) # type: ignore
):
    try:
        return crud_tfo.update_existing_tfo(db_conn=db_conn, tfo_id=tfo_id, tfo_data=tfo_data)
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Errore API PUT /tfos/{tfo_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Errore durante l'aggiornamento TFO: {str(e)}")
    finally:
        if db_conn: db_conn.close()

@router.delete("/{tfo_id}", response_model=BaseResponse)
def delete_tfo_endpoint(
    tfo_id: int = Path(..., description="ID TFO da eliminare"),
    db_conn: psycopg2.extensions.connection = Depends(get_db_connection) # type: ignore
):
    try:
        crud_tfo.delete_tfo_by_id(db_conn=db_conn, tfo_id=tfo_id)
        return BaseResponse(message=f"TFO ID {tfo_id} eliminata.")
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Errore API DELETE /tfos/{tfo_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Errore durante l'eliminazione TFO: {str(e)}")
    finally:
        if db_conn: db_conn.close()