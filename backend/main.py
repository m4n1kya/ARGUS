from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
import time
import os
import uuid
from . import models, schemas
from .database import engine, get_db

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ARGUS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ARGUS API",
        "timestamp": time.time()
    }

@app.post("/reports", response_model=schemas.HazardResponse)
async def create_report(
    hazard_class: models.HazardClass = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    # Save the image if provided
    image_path = None
    if image:
        file_ext = os.path.splitext(image.filename)[1]
        filename = f"{uuid.uuid4()}{file_ext}"
        image_path = os.path.join(UPLOAD_DIR, filename)
        with open(image_path, "wb") as buffer:
            content = await image.read()
            buffer.write(content)
            
    # Create the Point geometry (PostGIS expects Longitude Latitude for WKT)
    wkt_point = f"SRID=4326;POINT({lon} {lat})"

    db_hazard = models.Hazard(
        hazard_class=hazard_class,
        location=wkt_point,
        status="reported"
    )
    db.add(db_hazard)
    db.commit()
    db.refresh(db_hazard)
    
    # We must construct the response to include lat/lon extracted from DB or just use the input
    return {
        "id": db_hazard.id,
        "hazard_class": db_hazard.hazard_class,
        "lat": lat,
        "lon": lon,
        "severity_score": db_hazard.severity_score,
        "confidence": db_hazard.confidence,
        "recurrence_count": db_hazard.recurrence_count,
        "aurs_score": db_hazard.aurs_score,
        "status": db_hazard.status,
        "created_at": db_hazard.created_at,
        "updated_at": db_hazard.updated_at
    }

@app.get("/hazards", response_model=list[schemas.HazardResponse])
def get_hazards(db: Session = Depends(get_db)):
    # Query all hazards and extract lat/lon from the PostGIS geometry
    hazards = db.query(
        models.Hazard,
        func.ST_Y(models.Hazard.location).label('lat'),
        func.ST_X(models.Hazard.location).label('lon')
    ).all()
    
    result = []
    for hazard, lat, lon in hazards:
        result.append({
            "id": hazard.id,
            "hazard_class": hazard.hazard_class,
            "lat": lat,
            "lon": lon,
            "severity_score": hazard.severity_score,
            "confidence": hazard.confidence,
            "recurrence_count": hazard.recurrence_count,
            "aurs_score": hazard.aurs_score,
            "status": hazard.status,
            "created_at": hazard.created_at,
            "updated_at": hazard.updated_at
        })
    return result
