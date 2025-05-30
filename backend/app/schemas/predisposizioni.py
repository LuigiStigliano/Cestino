from pydantic import BaseModel, Field
from typing import Optional
import datetime

class PredisposizioneBase(BaseModel):
    id: int  # ID della tabella catasto_abitazioni
    indirizzo: Optional[str] = None
    comune: Optional[str] = None
    codice_catastale: Optional[str] = None
    data_predisposizione: Optional[datetime.date] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    uso_edificio: Optional[str] = None
    codice_belfiore: Optional[str] = None
    predisposto_fibra: Optional[bool] = None

class PredisposizioneInDB(PredisposizioneBase):
    pass

class PredisposizioneCreate(BaseModel):
    id: int  # Questo è l'id della tabella catasto_abitazioni
    indirizzo: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    uso_edificio: Optional[str] = None
    comune: str
    codice_belfiore: Optional[str] = None
    codice_catastale: Optional[str] = None
    data_predisposizione: datetime.date