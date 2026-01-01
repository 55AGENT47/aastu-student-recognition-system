from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from ..database import get_db
from ..models import models, schemas
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api", tags=["logs"])

@router.get("/main-logs", response_model=List[schemas.EventLog])
def read_main_logs(
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db)
):
    """Get logs from Main Security Portal live verification attempts (recognized and not recognized)"""
    logs = db.query(
        models.EventLog,
        models.Student.FirstName,
        models.Student.LastName,
        models.Student.StudentID.label('StudentIdentifier'),
        models.Student.PhotoPath,
        models.Camera.Location.label('CameraLocation')
    ).outerjoin(
        models.Student, models.EventLog.StudentID == models.Student.id
    ).join(
        models.Camera, models.EventLog.CameraID == models.Camera.CameraID
    ).filter(
        models.Camera.CameraID == 1
    ).order_by(desc(models.EventLog.EventTime)).offset(skip).limit(limit).all()
    
    result = []
    for log, first_name, last_name, student_identifier, photo_path, camera_location in logs:
        log_dict = {
            "LogID": log.LogID,
            "StudentID": student_identifier,
            "CameraID": log.CameraID,
            "MatchScore": log.MatchScore,
            "Decision": log.Decision,
            "EventTime": log.EventTime,
            "FirstName": first_name,
            "LastName": last_name,
            "PhotoPath": photo_path if first_name and last_name else None,
            "CameraLocation": camera_location or "Main Gate"
        }
        result.append(schemas.EventLog(**log_dict))  # type: ignore
    
    return result

@router.get("/event-logs", response_model=List[schemas.EventLog])
def read_event_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get all event logs (backward compatibility)"""
    logs = db.query(
        models.EventLog,
        models.Student.FirstName,
        models.Student.LastName,
        models.Camera.Location.label('CameraLocation')
    ).outerjoin(
        models.Student, models.EventLog.StudentID == models.Student.StudentID
    ).outerjoin(
        models.Camera, models.EventLog.CameraID == models.Camera.CameraID
    ).order_by(desc(models.EventLog.EventTime)).offset(skip).limit(limit).all()
    
    result = []
    for log, first_name, last_name, camera_location in logs:
        log_dict = {
            "LogID": log.LogID,
            "StudentID": log.StudentID,
            "CameraID": log.CameraID,
            "MatchScore": log.MatchScore,
            "Decision": log.Decision,
            "EventTime": log.EventTime,
            "FirstName": first_name,
            "LastName": last_name,
            "CameraLocation": camera_location
        }
        result.append(schemas.EventLog(**log_dict))  # type: ignore
    
    return result

@router.get("/cafeteria-logs", response_model=List[schemas.CafeteriaLog])
def read_cafeteria_logs(
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db)
):
    """Get logs from Cafeteria live verification attempts (recognized and not recognized)"""
    logs = db.query(
        models.CafeteriaLog,
        models.Student.FirstName,
        models.Student.LastName,
        models.Student.StudentID.label('StudentIdentifier'),
        models.Student.PhotoPath,
        models.Camera.Location.label('CameraLocation')
    ).outerjoin(
        models.Student, models.CafeteriaLog.StudentID == models.Student.id
    ).join(
        models.Camera, models.CafeteriaLog.CameraID == models.Camera.CameraID
    ).filter(
        models.Camera.CameraID == 2
    ).order_by(desc(models.CafeteriaLog.AccessTime)).offset(skip).limit(limit).all()
    
    result = []
    for log, first_name, last_name, student_identifier, photo_path, camera_location in logs:
        access_time = log.AccessTime if getattr(log, 'AccessTime', None) else datetime.utcnow()
        log_dict = {
            "LogID": log.LogID,
            "StudentID": student_identifier,
            "CameraID": log.CameraID,
            "AccessTime": access_time,
            "MatchScore": log.MatchScore,
            "Decision": log.Decision,
            "MealStatus": log.MealStatus,
            "MealPeriod": getattr(log, 'MealPeriod', None),
            "Notes": log.Notes,
            "FirstName": first_name,
            "LastName": last_name,
            "PhotoPath": photo_path if first_name and last_name else None,
            "CameraLocation": camera_location or "Cafeteria"
        }
        result.append(schemas.CafeteriaLog(**log_dict))  # type: ignore
    
    return result

@router.get("/duplicate-entries")
def get_duplicate_entries(db: Session = Depends(get_db)):
    """Get duplicate cafeteria entries for alerts"""
    duplicates = db.query(models.CafeteriaLog).filter(
        models.CafeteriaLog.IsDuplicateAttempt == True,
        models.CafeteriaLog.AccessTime >= datetime.utcnow() - timedelta(hours=24)
    ).count()
    
    return {"duplicate_count": duplicates, "has_duplicates": duplicates > 0}

@router.get("/students-in-cafeteria", response_model=List[schemas.CafeteriaLog])
def get_students_in_cafeteria(
    minutes: int = 30,
    db: Session = Depends(get_db)
):
    """Get students currently in cafeteria area (successful access within specified minutes)"""
    time_threshold = datetime.utcnow() - timedelta(minutes=minutes)
    
    logs = db.query(
        models.CafeteriaLog,
        models.Student.FirstName,
        models.Student.LastName,
        models.Student.PhotoPath,
        models.Camera.Location.label('CameraLocation')
    ).outerjoin(
        models.Student, models.CafeteriaLog.StudentID == models.Student.StudentID
    ).join(
        models.Camera, models.CafeteriaLog.CameraID == models.Camera.CameraID
    ).filter(
        models.Camera.CameraID == 2,
        models.CafeteriaLog.Decision == True,
        models.CafeteriaLog.AccessTime >= time_threshold
    ).order_by(desc(models.CafeteriaLog.AccessTime)).all()
    
    result = []
    for log, first_name, last_name, photo_path, camera_location in logs:
        log_dict = {
            "LogID": log.LogID,
            "StudentID": log.StudentID,
            "CameraID": log.CameraID,
            "AccessTime": log.AccessTime,
            "MatchScore": log.MatchScore,
            "Decision": log.Decision,
            "MealStatus": log.MealStatus,
            "Notes": log.Notes,
            "FirstName": first_name,
            "LastName": last_name,
            "PhotoPath": photo_path,
            "CameraLocation": camera_location
        }
        result.append(schemas.CafeteriaLog(**log_dict))
    
    return result

@router.delete("/clear-logs")
def clear_logs(
    log_type: str = Query(..., regex="^(access|cafeteria|all)$"),
    days_old: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Clear logs based on type and optional date filter
    
    Args:
        log_type: Type of logs to clear ('access', 'cafeteria', or 'all')
        days_old: If provided, only delete logs older than this many days
    """
    if current_user.role not in ["admin", "cafeteria", "main_gate"]:
        raise HTTPException(status_code=403, detail="Only administrators and security personnel can clear logs")
    
    try:
        timestamp_filter = None
        if days_old:
            timestamp_filter = datetime.utcnow() - timedelta(days=days_old)
        
        deleted_count = 0
        
        if log_type in ["access", "all"]:
            # Collect IDs to delete (avoid calling delete() on a joined query)
            id_query = db.query(models.EventLog.LogID).join(
                models.Camera, models.EventLog.CameraID == models.Camera.CameraID
            ).filter(models.Camera.Location == "Main Gate")
            if timestamp_filter:
                id_query = id_query.filter(models.EventLog.EventTime < timestamp_filter)
            ids = [r[0] for r in id_query.all()]
            if ids:
                deleted_count += db.query(models.EventLog).filter(models.EventLog.LogID.in_(ids)).delete(synchronize_session=False)
        
        if log_type in ["cafeteria", "all"]:
            id_query = db.query(models.CafeteriaLog.LogID).join(
                models.Camera, models.CafeteriaLog.CameraID == models.Camera.CameraID
            ).filter(or_(models.Camera.Location == "Cafeteria", models.Camera.Location.like("%cafeteria%")))
            if timestamp_filter:
                id_query = id_query.filter(models.CafeteriaLog.AccessTime < timestamp_filter)
            ids = [r[0] for r in id_query.all()]
            if ids:
                deleted_count += db.query(models.CafeteriaLog).filter(models.CafeteriaLog.LogID.in_(ids)).delete(synchronize_session=False)
        
        db.commit()
        return {
            "message": f"Successfully cleared {deleted_count} logs from {log_type}" + 
                       (f" older than {days_old} days" if days_old else "")
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing logs: {str(e)}")

@router.get("/camera-locations")
def get_camera_locations(db: Session = Depends(get_db)):
    """Get list of available camera locations"""
    locations = db.query(models.Camera.Location).distinct().all()
    return [loc[0] for loc in locations if loc[0]]

@router.get("/student-logs/{student_id}", response_model=List[schemas.EventLog])
def read_student_logs(
    student_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get logs for a specific student - for student portal"""
    student = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if current_user.role == "student" and str(student_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    logs = db.query(
        models.EventLog,
        models.Camera.Location.label('CameraLocation')
    ).join(
        models.Camera, models.EventLog.CameraID == models.Camera.CameraID
    ).filter(
        models.EventLog.StudentID == student_id
    ).order_by(desc(models.EventLog.EventTime)).offset(skip).limit(limit).all()
    
    result = []
    for log, camera_location in logs:
        log_dict = {
            "LogID": log.LogID,
            "StudentID": log.StudentID,
            "CameraID": log.CameraID,
            "MatchScore": log.MatchScore,
            "Decision": log.Decision,
            "EventTime": log.EventTime,
            "FirstName": student.FirstName,
            "LastName": student.LastName,
            "CameraLocation": camera_location
        }
        result.append(schemas.EventLog(**log_dict))  # type: ignore
    
    return result