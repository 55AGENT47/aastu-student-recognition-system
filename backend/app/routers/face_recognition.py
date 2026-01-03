from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from ..database import get_db
from ..models import models, schemas
from ..utils.auth import get_current_user, get_current_user_optional
from ..services.face_recognition_service import face_service
from ..services.notification_service import notification_service
from ..services.ip_camera_log_service import ip_camera_log_service
from ..utils.meal_period import get_meal_period
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/face", tags=["face_recognition"])


class FaceRequest(BaseModel):
    image_data: str
    camera_id: int = 1
    camera_type: str = "Webcam"

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
        print(f"Received camera_type: {request.camera_type}, camera_id: {request.camera_id}")
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
            access_time = datetime.now()
            
            # Get meal schedules
            schedules = db.query(models.MealSchedule).filter(models.MealSchedule.IsActive == True).all()
            schedule_list = [{
                'MealName': s.MealName,
                'StartTime': s.StartTime,
                'EndTime': s.EndTime,
                'IsActive': s.IsActive
            } for s in schedules] if schedules else None
            
            meal_period = get_meal_period(access_time, schedule_list)
            
            if student_record and getattr(student_record, 'CafeAccess', False):
                # Check for duplicate entry in the same meal period today
                today_start = access_time.replace(hour=0, minute=0, second=0, microsecond=0)
                today_end = access_time.replace(hour=23, minute=59, second=59, microsecond=999)
                
                existing_logs = db.query(models.CafeteriaLog).filter(
                    and_(
                        models.CafeteriaLog.StudentID == getattr(student_record, 'id'),
                        models.CafeteriaLog.AccessTime >= today_start,
                        models.CafeteriaLog.AccessTime <= today_end,
                        models.CafeteriaLog.MealPeriod == meal_period,
                        models.CafeteriaLog.MealStatus != 'Denied',
                        models.CafeteriaLog.MealStatus != 'NON CAFE STUDENT'
                    )
                ).all()
                
                is_duplicate = len(existing_logs) > 0 and success and confidence >= 0.55
                
                cafeteria_log = models.CafeteriaLog(
                    StudentID=getattr(student_record, 'id'),
                    CameraID=request.camera_id,
                    MatchScore=confidence,
                    Decision=decision_status,
                    AccessTime=access_time,
                    MealPeriod=meal_period,
                    MealStatus="Pending" if is_duplicate else "Allowed",
                    CameraType=request.camera_type,
                    Notes="Verification successful" + (" - Duplicate entry detected" if is_duplicate else "")
                )
                db.add(cafeteria_log)
                db.flush()  # Get the LogID
                
                # Create notification for duplicate entry only if verified
                if is_duplicate:
                    student_name = f"{student_record.FirstName} {student_record.LastName}"
                    log_id: int = getattr(cafeteria_log, 'LogID', 0)  # type: ignore
                    notification_service.create_duplicate_entry_alert(
                        db, 
                        student_name, 
                        getattr(student_record, 'id'), 
                        log_id
                    )
                    result["is_duplicate"] = True
                    result["log_id"] = log_id
                    result["requires_action"] = True
            elif student_record:
                # NON CAFE STUDENT
                cafeteria_log = models.CafeteriaLog(
                    StudentID=getattr(student_record, 'id'),
                    CameraID=request.camera_id,
                    MatchScore=confidence,
                    Decision=decision_status,
                    AccessTime=access_time,
                    MealPeriod=meal_period,
                    MealStatus="NON CAFE STUDENT",
                    CameraType=request.camera_type,
                    Notes="Student does not have cafeteria access"
                )
                db.add(cafeteria_log)
                result["non_cafe_student"] = True
                result["access_granted"] = False
        else:
            # Main gate portal - log to EventLogs
            if student_record and success and confidence >= 0.55:
                # Successful verification
                event_log = models.EventLog(
                    StudentID=getattr(student_record, 'id'),
                    CameraID=request.camera_id,
                    MatchScore=confidence,
                    Decision=True,
                    EventTime=datetime.now(),
                    CameraType=request.camera_type,
                    VerificationStatus="Success",
                    Notes=f"Student: {student_record.FirstName} {student_record.LastName}, Confidence: {confidence:.2f}"
                )
                db.add(event_log)
            else:
                # Failed verification
                reason = "Face not detected" if not success else "Low confidence" if confidence < 0.55 else "Unknown person"
                event_log = models.EventLog(
                    StudentID=getattr(student_record, 'id') if student_record else None,
                    CameraID=request.camera_id,
                    MatchScore=confidence,
                    Decision=False,
                    EventTime=datetime.now(),
                    CameraType=request.camera_type,
                    VerificationStatus="Failed",
                    Notes=f"Reason: {reason}, Confidence: {confidence:.2f}"
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
