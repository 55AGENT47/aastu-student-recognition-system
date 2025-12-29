from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models, schemas
from ..utils.auth import get_current_user, get_current_user_optional
from ..services.face_recognition_service import face_service
from datetime import datetime

router = APIRouter(prefix="/api/face", tags=["face_recognition"])


class FaceRequest(BaseModel):
    image_data: str
    camera_id: int = 1

class ValidateRequest(BaseModel):
    image_data: str

@router.post("/validate", response_model=schemas.FaceValidationResponse)
async def validate_face(request: ValidateRequest):
    """Validate if image contains exactly one face"""
    try:
        result = face_service.validate_face(request.image_data)
        return schemas.FaceValidationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/register", response_model=schemas.FaceRegistrationResponse)
async def register_face(
    student_id: int = Form(...),
    name: str = Form(...),
    image_data: str = Form(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Register a face for a student"""
    try:
        student = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        result = face_service.register_face(db, student_id, name, image_data)
        return schemas.FaceRegistrationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify")
async def verify_face(
    request: FaceRequest,
    db: Session = Depends(get_db)
):
    """Verify face against known faces"""
    try:
        result = face_service.verify_face(db, request.image_data)
        result["timestamp"] = datetime.now().isoformat()
        camera = db.query(models.Camera).filter(models.Camera.CameraID == request.camera_id).first()
        camera_location = str(camera.Location) if camera else None

        student_id = result["student"].get("StudentID") if result.get("student") else None
        confidence = result.get("confidence", 0.0)
        success = result.get("success", False)
        decision_status = bool(success)
        
        student_record = None
        if student_id:
            student_record = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
        
        # Determine portal type based on camera ID
        if request.camera_id == 2:
            # Cafeteria portal - log to CafeteriaLogs
            if student_record and getattr(student_record, 'CafeAccess', False):
                cafeteria_log = models.CafeteriaLog(
                    StudentID=getattr(student_record, 'id'),
                    CameraID=request.camera_id,
                    MatchScore=confidence,
                    Decision=decision_status,
                    AccessTime=datetime.now(),
                    MealStatus="Allowed",
                    Notes="Verification successful"
                )
                db.add(cafeteria_log)
            elif student_record:
                # NON CAFE STUDENT
                cafeteria_log = models.CafeteriaLog(
                    StudentID=getattr(student_record, 'id'),
                    CameraID=request.camera_id,
                    MatchScore=confidence,
                    Decision=decision_status,
                    AccessTime=datetime.now(),
                    MealStatus="NON CAFE STUDENT",
                    Notes="Student does not have cafeteria access"
                )
                db.add(cafeteria_log)
                result["non_cafe_student"] = True
                result["access_granted"] = False
        else:
            # Main gate portal - log to EventLogs
            if student_record:
                event_log = models.EventLog(
                    StudentID=student_record.id,
                    CameraID=request.camera_id,
                    MatchScore=confidence,
                    Decision=decision_status,
                    EventTime=datetime.now()
                )
                db.add(event_log)
        
        db.commit()

        if camera_location == "Cafeteria" and result.get("student"):
            student = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
            has_cafe = bool(getattr(student, 'CafeAccess', False)) if student else False
            if not has_cafe:
                result["access_granted"] = False

        return result
    except Exception as e:
        print(f"Verification error: {e}")
        return {"success": False, "student": None, "confidence": 0.0, "timestamp": datetime.now().isoformat(), "access_granted": False, "message": str(e)}

@router.post("/detect", response_model=schemas.FaceDetectionResult)
async def detect_faces(
    request: FaceRequest,
    db: Session = Depends(get_db),
    current_user: Optional[schemas.User] = Depends(get_current_user_optional)
):
    """Detect and identify faces in image"""
    try:
        result = face_service.detect_faces(db, request.image_data)
        result["timestamp"] = datetime.now().isoformat()
        return schemas.FaceDetectionResult(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/known-faces", response_model=List[schemas.KnownFaceResponse])
async def get_known_faces(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get all known faces"""
    try:
        known_faces = db.query(models.KnownFace).all()
        return [schemas.KnownFaceResponse.from_orm(face) for face in known_faces]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{face_id}")
async def delete_face(
    face_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Delete a known face"""
    try:
        face = db.query(models.KnownFace).filter(models.KnownFace.id == face_id).first()
        if not face:
            raise HTTPException(status_code=404, detail="Face not found")
        
        db.delete(face)
        db.commit()
        
        face_service.load_known_faces_from_db(db)
        
        return {"message": "Face deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
