from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models, schemas
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/cameras", tags=["cameras"])

@router.get("", response_model=List[schemas.Camera])
@router.get("/", response_model=List[schemas.Camera])
def read_cameras(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return db.query(models.Camera).offset(skip).limit(limit).all()

@router.post("/", response_model=schemas.Camera)
def create_camera(camera: schemas.CameraCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    if camera.IP_Address and db.query(models.Camera).filter(models.Camera.IP_Address == camera.IP_Address).first():
        raise HTTPException(status_code=400, detail="IP address already registered")
    
    db_camera = models.Camera(**camera.dict(), Status="Active")
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

@router.get("/{camera_id}", response_model=schemas.Camera)
def read_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    db_camera = db.query(models.Camera).filter(models.Camera.CameraID == camera_id).first()
    if db_camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return db_camera

@router.put("/{camera_id}", response_model=schemas.Camera)
def update_camera(camera_id: int, camera: schemas.CameraUpdate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    db_camera = db.query(models.Camera).filter(models.Camera.CameraID == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    if camera.IP_Address and camera.IP_Address != db_camera.IP_Address and db.query(models.Camera).filter(models.Camera.IP_Address == camera.IP_Address).first():
        raise HTTPException(status_code=400, detail="IP address already registered")
    
    for field, value in camera.dict(exclude_unset=True).items():
        setattr(db_camera, field, value)
    
    db.commit()
    db.refresh(db_camera)
    return db_camera

@router.patch("/{camera_id}/toggle")
def toggle_camera(camera_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    db_camera = db.query(models.Camera).filter(models.Camera.CameraID == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    setattr(db_camera, 'Status', "Inactive" if str(db_camera.Status) == "Active" else "Active")
    db.commit()
    db.refresh(db_camera)
    return {"message": f"Camera status changed to {db_camera.Status}"}

@router.delete("/{camera_id}")
def delete_camera(camera_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    db_camera = db.query(models.Camera).filter(models.Camera.CameraID == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    try:
        db.query(models.EventLog).filter(models.EventLog.CameraID == camera_id).delete(synchronize_session=False)
        db.query(models.CafeteriaLog).filter(models.CafeteriaLog.CameraID == camera_id).delete(synchronize_session=False)
        db.delete(db_camera)
        db.commit()
        return {"message": "Camera deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting camera: {str(e)}")