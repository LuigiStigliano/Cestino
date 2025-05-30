from pydantic import BaseModel
from typing import Optional

class BaseResponse(BaseModel):
    status: str = "success"
    message: Optional[str] = None