from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models, schemas
from ..utils.auth import get_current_user
from ..services.notification_service import notification_service
from datetime import datetime

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("/", response_model=List[schemas.Notification])
def get_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get notifications for current user"""
    role = current_user.role
    notifications = notification_service.get_notifications(db, role, unread_only)
    return notifications

@router.post("/{notification_id}/mark-read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Mark notification as read"""
    notification_service.mark_as_read(db, notification_id)
    return {"message": "Notification marked as read"}

@router.post("/{notification_id}/action")
def handle_notification_action(
    notification_id: int,
    action: str = Query(..., regex="^(allow|deny|flag)$"),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Handle notification action (ALLOW, DENY, FLAG) for duplicate entries"""
    if current_user.role != "cafeteria":
        raise HTTPException(status_code=403, detail="Only cafeteria security can perform this action")
    
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()
    
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Access notification attributes (these are Python values, not Column objects at runtime)
    notification_type: str = getattr(notification, 'type', None)  # type: ignore
    if notification_type != "duplicate_entry":
        raise HTTPException(status_code=400, detail="This action is only for duplicate entry notifications")
    
    log_id: int | None = getattr(notification, 'log_id', None)  # type: ignore
    if log_id is None:
        raise HTTPException(status_code=400, detail="Notification does not have associated log")
    
    # Get the cafeteria log
    cafeteria_log = db.query(models.CafeteriaLog).filter(
        models.CafeteriaLog.LogID == log_id
    ).first()
    
    if cafeteria_log is None:
        raise HTTPException(status_code=404, detail="Cafeteria log not found")
    
    # Update meal status based on action
    # Using setattr to avoid type checker issues with SQLAlchemy Column assignments
    if action == "allow":
        setattr(cafeteria_log, 'MealStatus', "Allowed")  # type: ignore
        setattr(cafeteria_log, 'Notes', "Allowed by cafeteria security despite duplicate entry")  # type: ignore
    elif action == "deny":
        setattr(cafeteria_log, 'MealStatus', "Denied")  # type: ignore
        setattr(cafeteria_log, 'Notes', "Denied by cafeteria security due to duplicate entry")  # type: ignore
    elif action == "flag":
        setattr(cafeteria_log, 'MealStatus', "Allowed with warning")  # type: ignore
        setattr(cafeteria_log, 'Notes', "Flagged by cafeteria security - duplicate entry allowed with warning")  # type: ignore
    
    # Mark notification as read
    setattr(notification, 'is_read', True)  # type: ignore
    
    db.commit()
    
    # Access attributes for return value
    meal_status: str = getattr(cafeteria_log, 'MealStatus', '')  # type: ignore
    log_id_value: int = getattr(cafeteria_log, 'LogID', 0)  # type: ignore
    
    return {
        "message": f"Action '{action}' processed successfully",
        "log_id": log_id_value,
        "meal_status": meal_status
    }

