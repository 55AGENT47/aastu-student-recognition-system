from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import models
from ..utils.auth import get_current_user
from ..models.schemas import User

router = APIRouter(prefix="/api/meal-schedules", tags=["meal_schedules"])

class MealScheduleUpdate(BaseModel):
    ScheduleID: int
    MealName: str
    StartTime: str
    EndTime: str
    IsActive: bool = True

@router.get("/")
def get_meal_schedules(db: Session = Depends(get_db)):
    """Get all meal schedules"""
    schedules = db.query(models.MealSchedule).all()
    if not schedules:
        # Create default schedules
        defaults = [
            models.MealSchedule(MealName="Breakfast", StartTime="06:00:00", EndTime="10:00:00", IsActive=True),
            models.MealSchedule(MealName="Lunch", StartTime="11:00:00", EndTime="15:00:00", IsActive=True),
            models.MealSchedule(MealName="Dinner", StartTime="17:00:00", EndTime="21:00:00", IsActive=True)
        ]
        db.add_all(defaults)
        db.commit()
        schedules = db.query(models.MealSchedule).all()
    return schedules

@router.post("/")
def update_meal_schedule(
    schedule: MealScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update meal schedule"""
    if current_user.role not in ["admin", "cafeteria"]:
        raise HTTPException(status_code=403, detail="Only admin and cafeteria security can update schedules")
    
    db_schedule = db.query(models.MealSchedule).filter(
        models.MealSchedule.ScheduleID == schedule.ScheduleID
    ).first()
    
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    db_schedule.StartTime = schedule.StartTime  # type: ignore
    db_schedule.EndTime = schedule.EndTime  # type: ignore
    db_schedule.IsActive = schedule.IsActive  # type: ignore
    
    db.commit()
    return {"message": "Schedule updated successfully"}

@router.post("/reset-daily-entries")
def reset_daily_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset all cafeteria entries for today"""
    if current_user.role not in ["admin", "cafeteria"]:
        raise HTTPException(status_code=403, detail="Only admin and cafeteria security can reset entries")
    
    from datetime import datetime
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    deleted = db.query(models.CafeteriaLog).filter(
        models.CafeteriaLog.AccessTime >= today_start
    ).delete()
    
    db.commit()
    return {"message": f"Reset {deleted} entries for today"}
