from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from ..database import get_db
from ..models import models, schemas
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/stats", tags=["statistics"])

@router.get("/overview", response_model=schemas.StatsResponse)
def get_overview_stats(db: Session = Depends(get_db)):
    total_students = db.query(models.Student).filter(models.Student.IsActive == True).count()
    today = date.today()
    
    # Get today's main gate access (from EventLogs with Main Gate camera)
    today_access = db.query(models.EventLog).join(
        models.Camera, models.EventLog.CameraID == models.Camera.CameraID
    ).filter(
        and_(
            func.date(models.EventLog.EventTime) == today,
            models.EventLog.Decision == True,
            models.Camera.Location == "Main Gate"
        )
    ).count()
    
    # Get today's cafeteria access (from CafeteriaLogs with Cafeteria camera)
    today_cafeteria_access = db.query(models.CafeteriaLog).join(
        models.Camera, models.CafeteriaLog.CameraID == models.Camera.CameraID
    ).filter(
        and_(
            func.date(models.CafeteriaLog.AccessTime) == today,
            models.CafeteriaLog.Decision == True,
            models.Camera.Location.like("%Cafeteria%")
        )
    ).count()
    
    thirty_days_ago = datetime.now() - timedelta(days=30)
    total_attempts = db.query(models.EventLog).filter(models.EventLog.EventTime >= thirty_days_ago).count()
    successful_attempts = db.query(models.EventLog).filter(and_(models.EventLog.EventTime >= thirty_days_ago, models.EventLog.Decision == True)).count()
    success_rate = (successful_attempts / total_attempts * 100) if total_attempts > 0 else 0
    
    active_points = db.query(models.Camera).filter(models.Camera.Status == "Active").count()
    
    seven_days_ago = datetime.now() - timedelta(days=7)
    fourteen_days_ago = datetime.now() - timedelta(days=14)
    recent_access = db.query(models.EventLog).filter(and_(models.EventLog.EventTime >= seven_days_ago, models.EventLog.Decision == True)).count()
    previous_access = db.query(models.EventLog).filter(and_(models.EventLog.EventTime >= fourteen_days_ago, models.EventLog.EventTime < seven_days_ago, models.EventLog.Decision == True)).count()
    recent_trend = ((recent_access - previous_access) / previous_access * 100) if previous_access > 0 else 0
    
    # Get recent history from both EventLogs and CafeteriaLogs
    recent_event_logs = db.query(
        models.EventLog.LogID,
        models.EventLog.StudentID,
        models.EventLog.EventTime.label('timestamp'),
        models.EventLog.Decision,
        models.Student.FirstName,
        models.Student.LastName,
        models.Camera.Location
    ).outerjoin(
        models.Student, models.EventLog.StudentID == models.Student.StudentID
    ).outerjoin(
        models.Camera, models.EventLog.CameraID == models.Camera.CameraID
    ).filter(
        models.Camera.Location == "Main Gate"
    ).order_by(models.EventLog.EventTime.desc()).limit(10).all()
    
    recent_cafeteria_logs = db.query(
        models.CafeteriaLog.LogID,
        models.CafeteriaLog.StudentID,
        models.CafeteriaLog.AccessTime.label('timestamp'),
        models.CafeteriaLog.Decision,
        models.Student.FirstName,
        models.Student.LastName,
        models.Camera.Location
    ).outerjoin(
        models.Student, models.CafeteriaLog.StudentID == models.Student.StudentID
    ).outerjoin(
        models.Camera, models.CafeteriaLog.CameraID == models.Camera.CameraID
    ).filter(
        models.Camera.Location.like("%Cafeteria%")
    ).order_by(models.CafeteriaLog.AccessTime.desc()).limit(10).all()
    
    # Combine and sort by timestamp
    all_recent = []
    for log in recent_event_logs:
        all_recent.append({
            "LogID": log.LogID,
            "StudentID": log.StudentID,
            "EventTime": log.timestamp,
            "Decision": log.Decision,
            "FirstName": log.FirstName,
            "LastName": log.LastName,
            "Location": log.Location
        })
    for log in recent_cafeteria_logs:
        all_recent.append({
            "LogID": log.LogID,
            "StudentID": log.StudentID,
            "EventTime": log.timestamp,
            "Decision": log.Decision,
            "FirstName": log.FirstName,
            "LastName": log.LastName,
            "Location": log.Location
        })
    
    all_recent.sort(key=lambda x: x["EventTime"], reverse=True)
    recent_history = all_recent[:10]
    
    # Anonymize student data for public access
    anonymized_history = []
    for item in recent_history:
        anonymized_history.append({
            "LogID": item["LogID"],
            "StudentID": item["StudentID"],
            "EventTime": item["EventTime"],
            "Decision": item["Decision"],
            "FirstName": item["FirstName"] if item["FirstName"] else "Unknown",
            "LastName": item["LastName"] if item["LastName"] else "Student",
            "Location": item["Location"] or "Campus"
        })
    
    return {
        "totalStudents": total_students,
        "todayAccess": today_access,
        "todayCafeteriaAccess": today_cafeteria_access,
        "successRate": round(success_rate, 1),
        "activePoints": active_points,
        "recentTrend": round(recent_trend, 1),
        "recentHistory": anonymized_history
    }