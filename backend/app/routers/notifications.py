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
    action: str = Query(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Handle notification action (ALLOW, DENY, FLAG) for duplicate entries"""
    if action not in ["allow", "deny", "flag"]:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'allow', 'deny', or 'flag'")
    
    if current_user.role != "cafeteria":
        raise HTTPException(status_code=403, detail="Only cafeteria security can perform this action")
    
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification.type != "duplicate_entry":  # type: ignore
        raise HTTPException(status_code=400, detail="This action is only for duplicate entry notifications")
    
    if not notification.log_id:  # type: ignore
        notification.is_read = True  # type: ignore
        db.commit()
        raise HTTPException(status_code=400, detail="This notification does not have an associated log entry. It has been marked as read.")
    
    cafeteria_log = db.query(models.CafeteriaLog).filter(
        models.CafeteriaLog.LogID == notification.log_id  # type: ignore
    ).first()
    
    if not cafeteria_log:
        raise HTTPException(status_code=404, detail="Cafeteria log not found")
    
    if action == "allow":
        cafeteria_log.MealStatus = "Allowed"  # type: ignore
        cafeteria_log.Notes = "Allowed by cafeteria security despite duplicate entry"  # type: ignore
    elif action == "deny":
        cafeteria_log.MealStatus = "Denied"  # type: ignore
        cafeteria_log.Notes = "Denied by cafeteria security due to duplicate entry"  # type: ignore
    else:
        cafeteria_log.MealStatus = "Allowed with warning"  # type: ignore
        cafeteria_log.Notes = "Flagged by cafeteria security - duplicate entry allowed with warning"  # type: ignore
    
    notification.is_read = True  # type: ignore
    db.commit()
    db.refresh(cafeteria_log)
    
    return {
        "message": f"Action '{action}' processed successfully",
        "log_id": cafeteria_log.LogID,  # type: ignore
        "meal_status": cafeteria_log.MealStatus  # type: ignore
    }

