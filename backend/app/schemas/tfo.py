from pydantic import BaseModel
from typing import Optional
import datetime

class TfoBase(BaseModel):
    id_abitazione: int
    data_predisposizione_tfo: Optional[datetime.date] = None # Nome originale nel DB per creazione/update
    scala: Optional[str] = None
    piano: Optional[str] = None
    interno: Optional[str] = None
    id_operatore: Optional[str] = None
    id_tfo: Optional[str] = None # Codice Identificativo TFO
    id_roe: Optional[str] = None # Codice Identificativo ROE

class TfoCreate(TfoBase):
    pass

class TfoInDB(TfoBase):
    id: int  # ID univoco della tabella verifiche_edifici
    
    # Questi campi vengono recuperati dalla tabella catasto_abitazioni e aggiunti per la risposta
    indirizzo: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    codice_catastale: Optional[str] = None
    
    # Rinomina data_predisposizione_tfo a data_predisposizione per coerenza con frontend
    # Questo è un alias, il campo nel DB rimane data_predisposizione_tfo
    data_predisposizione: Optional[datetime.date] = None

    class Config:
        orm_mode = True # Mantenuto se si usa ORM, altrimenti può essere rimosso
        # Se non si usa ORM e si costruisce manualmente il dict, orm_mode non è strettamente necessario
        # ma può essere utile se si ha un mix. Per psycopg2 diretto, non è usato.


# Per la risposta GET /predisposizioni/{predisposizione_id}/tfos
# il campo data_predisposizione_tfo viene mappato a data_predisposizione
# Questo può essere gestito nel CRUD o qui se si fa una trasformazione esplicita
# Ad esempio, usando un `alias` nel Field o un `validator`.
# Per semplicità, la trasformazione avviene nel CRUD.