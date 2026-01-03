from sqlalchemy.orm import Session
from datetime import datetime
from ..models import models
from typing import Optional

class IPCameraLogService:
    @staticmethod
    def log_verification_attempt(
        db: Session,
        camera_id: int,
        student_id: Optional[int] = None,
        match_score: float = 0.0,
        decision: bool = False,
        camera_type: str = "IP Camera",
        verification_status: str = "Failed",
        notes: str = ""
    ) -> models.EventLog:
        """
        Log IP camera verification attempt with detailed information
        """
        event_log = models.EventLog(
            StudentID=student_id,
            CameraID=camera_id,
            MatchScore=match_score,
            Decision=decision,
            EventTime=datetime.now(),
            CameraType=camera_type,
            VerificationStatus=verification_status,
            Notes=notes
        )
        
        db.add(event_log)
        db.commit()
        db.refresh(event_log)
        
        return event_log
    
    @staticmethod
    def log_success(
        db: Session,
        camera_id: int,
        student_id: int,
        match_score: float,
        student_name: str
    ) -> models.EventLog:
        """Log successful IP camera verification"""
        notes = f"Student: {student_name}, Confidence: {match_score:.2f}"
        
        return IPCameraLogService.log_verification_attempt(
            db=db,
            camera_id=camera_id,
            student_id=student_id,
            match_score=match_score,
            decision=True,
            verification_status="Success",
            notes=notes
        )
    
    @staticmethod
    def log_failure(
        db: Session,
        camera_id: int,
        match_score: float,
        reason: str = "Unknown person"
    ) -> models.EventLog:
        """Log failed IP camera verification"""
        notes = f"Reason: {reason}, Confidence: {match_score:.2f}"
        
        return IPCameraLogService.log_verification_attempt(
            db=db,
            camera_id=camera_id,
            student_id=None,
            match_score=match_score,
            decision=False,
            verification_status="Failed",
            notes=notes
        )
    
    @staticmethod
    def log_connection_event(
        db: Session,
        camera_id: int,
        event_type: str,
        details: str = ""
    ) -> models.EventLog:
        """Log IP camera connection events"""
        notes = f"Connection event: {event_type}"
        if details:
            notes += f", Details: {details}"
        
        return IPCameraLogService.log_verification_attempt(
            db=db,
            camera_id=camera_id,
            student_id=None,
            match_score=0.0,
            decision=event_type == "Connected",
            verification_status=event_type,
            notes=notes
        )

ip_camera_log_service = IPCameraLogService()