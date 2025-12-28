from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime, time
from ..database import get_db
from ..models.models import MealSchedule, CafeteriaLog
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/meal-schedules", tags=["meal_schedules"])

class MealScheduleCreate(BaseModel):
    MealName: str
    StartTime: str
    EndTime: str
    IsActive: bool = True

class MealScheduleResponse(BaseModel):
    ScheduleID: int
    MealName: str
    StartTime: str
    EndTime: str
    IsActive: bool

    class Config:
        from_attributes = True

@router.get("", response_model=List[MealScheduleResponse])
def get_meal_schedules(db: Session = Depends(get_db)):
    schedules = db.query(MealSchedule).filter(MealSchedule.IsActive == True).all()
    result = []
    for s in schedules:
        start = str(s.StartTime) if isinstance(s.StartTime, str) else str(s.StartTime).split()[-1] if s.StartTime else "00:00:00"
        end = str(s.EndTime) if isinstance(s.EndTime, str) else str(s.EndTime).split()[-1] if s.EndTime else "00:00:00"
        result.append(MealScheduleResponse(
            ScheduleID=s.ScheduleID,
            MealName=s.MealName,
            StartTime=start,
            EndTime=end,
            IsActive=s.IsActive
        ))
    return result

@router.post("", response_model=MealScheduleResponse)
def create_or_update_meal_schedule(schedule: MealScheduleCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    existing = db.query(MealSchedule).filter(MealSchedule.MealName == schedule.MealName).first()
    
    if existing:
        setattr(existing, 'StartTime', schedule.StartTime)
        setattr(existing, 'EndTime', schedule.EndTime)
        setattr(existing, 'IsActive', schedule.IsActive)
        setattr(existing, 'UpdatedAt', datetime.now())
        db.commit()
        db.refresh(existing)
        start = str(existing.StartTime) if isinstance(existing.StartTime, str) else str(existing.StartTime).split()[-1] if existing.StartTime else "00:00:00"
        end = str(existing.EndTime) if isinstance(existing.EndTime, str) else str(existing.EndTime).split()[-1] if existing.EndTime else "00:00:00"
        return MealScheduleResponse(
            ScheduleID=existing.ScheduleID,
            MealName=existing.MealName,
            StartTime=start,
            EndTime=end,
            IsActive=existing.IsActive
        )
    
    new_schedule = MealSchedule(**schedule.dict())
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    start = str(new_schedule.StartTime) if isinstance(new_schedule.StartTime, str) else str(new_schedule.StartTime).split()[-1] if new_schedule.StartTime else "00:00:00"
    end = str(new_schedule.EndTime) if isinstance(new_schedule.EndTime, str) else str(new_schedule.EndTime).split()[-1] if new_schedule.EndTime else "00:00:00"
    return MealScheduleResponse(
        ScheduleID=new_schedule.ScheduleID,
        MealName=new_schedule.MealName,
        StartTime=start,
        EndTime=end,
        IsActive=new_schedule.IsActive
    )

@router.post("/reset-daily-entries")
def reset_daily_entries(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Manual reset of cafeteria entries - clears today's tracking"""
    today = datetime.now().date()
    db.query(CafeteriaLog).filter(
        CafeteriaLog.AccessTime >= today
    ).delete()
    db.commit()
    return {"message": "Daily entries reset successfully"}

def get_current_meal_period(db: Session) -> str | None:
    """Determine which meal period the current time falls into"""
    current_time = datetime.now().time()
    schedules = db.query(MealSchedule).filter(MealSchedule.IsActive == True).all()
    
    for schedule in schedules:
        start_time = str(schedule.StartTime)
        end_time = str(schedule.EndTime)
        start = datetime.strptime(start_time, "%H:%M:%S").time()
        end = datetime.strptime(end_time, "%H:%M:%S").time()
        
        if start <= current_time <= end:
            return str(schedule.MealName)
    
    return None

def check_duplicate_entry(student_id: int, meal_period: str, db: Session):
    """Check if student already entered during this meal period today"""
    today = datetime.now().date()
    
    existing_entry = db.query(CafeteriaLog).filter(
        CafeteriaLog.StudentID == student_id,
        CafeteriaLog.MealPeriod == meal_period,
        CafeteriaLog.Decision == True,
        CafeteriaLog.IsDuplicateAttempt == False,
        CafeteriaLog.AccessTime >= today
    ).first()
    
    return existing_entry
