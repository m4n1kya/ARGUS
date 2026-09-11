from sqlalchemy import Column, Integer, String, Float, DateTime, Enum
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from .database import Base
import enum

class HazardClass(str, enum.Enum):
    pothole = "pothole"
    garbage = "garbage"
    construction = "construction"
    debris = "debris"
    exposed_wire = "exposed_wire"

class Hazard(Base):
    __tablename__ = "hazards"

    id = Column(Integer, primary_key=True, index=True)
    hazard_class = Column(Enum(HazardClass), nullable=False)
    
    # PostGIS geometry column for storing coordinates (SRID 4326 for GPS coords)
    location = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    
    # severity feature extraction
    severity_score = Column(Float, nullable=True) 
    confidence = Column(Float, nullable=True)
    
    # fusion / AURS metrics
    recurrence_count = Column(Integer, default=1)
    aurs_score = Column(Float, nullable=True)
    
    # state
    status = Column(String, default="reported") # reported, verified, resolved
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
