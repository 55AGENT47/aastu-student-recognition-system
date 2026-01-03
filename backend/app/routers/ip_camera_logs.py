from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from datetime import datetime, timedelta
from ..database import get_db
from ..models import models, schemas
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/ip-camera-logs", tags=["ip_camera_logs"])

@router.get("/", response_model=List[schemas.EventLogResponse])
async def get_ip_camera_logs(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    camera_type: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    hours: Optional[int] = Query(24, description="Filter logs from last N hours"),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get IP camera verification logs with filtering"""
    
    query = db.query(models.EventLog)
    
    # Filter by time range
    if hours:
        since = datetime.now() - timedelta(hours=hours)
        query = query.filter(models.EventLog.EventTime >= since)
    
    # Filter by camera type
    if camera_type:
        query = query.filter(models.EventLog.CameraType == camera_type)
    
    # Filter by verification status
    if verification_status:
        query = query.filter(models.EventLog.VerificationStatus == verification_status)
    
    # Order by most recent first
    query = query.order_by(desc(models.EventLog.EventTime))
    
    # Apply pagination
    logs = query.offset(offset).limit(limit).all()
    
    return [schemas.EventLogResponse.from_orm(log) for log in logs]

@router.get("/stats")
async def get_ip_camera_stats(
    hours: int = Query(24, description="Stats from last N hours"),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get IP camera verification statistics"""
    
    since = datetime.now() - timedelta(hours=hours)
    
    # Total attempts
    total_attempts = db.query(models.EventLog).filter(
        and_(
            models.EventLog.EventTime >= since,
            models.EventLog.CameraType == "IP Camera"
        )
    ).count()
    
    # Successful verifications
    successful = db.query(models.EventLog).filter(
        and_(
            models.EventLog.EventTime >= since,
            models.EventLog.CameraType == "IP Camera",
            models.EventLog.VerificationStatus == "Success"
        )
    ).count()
    
    # Failed verifications
    failed = db.query(models.EventLog).filter(
        and_(
            models.EventLog.EventTime >= since,
            models.EventLog.CameraType == "IP Camera",
            models.EventLog.VerificationStatus == "Failed"
        )
    ).count()
    
    # Unknown persons
    unknown = db.query(models.EventLog).filter(
        and_(
            models.EventLog.EventTime >= since,
            models.EventLog.CameraType == "IP Camera",
            models.EventLog.VerificationStatus == "Failed",
            models.EventLog.StudentID.is_(None)
        )
    ).count()
    
    success_rate = (successful / total_attempts * 100) if total_attempts > 0 else 0
    
    return {
        "total_attempts": total_attempts,
        "successful": successful,
        "failed": failed,
        "unknown_persons": unknown,
        "success_rate": round(success_rate, 2),
        "time_period_hours": hours
    }