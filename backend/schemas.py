from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from .models import HazardClass

class HazardBase(BaseModel):
    hazard_class: HazardClass
    severity_score: Optional[float] = None
    confidence: Optional[float] = None

class HazardCreate(HazardBase):
    lat: float
    lon: float

class HazardResponse(HazardBase):
    id: int
    lat: float
    lon: float
    recurrence_count: int
    aurs_score: Optional[float]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True
        from_attributes = True
