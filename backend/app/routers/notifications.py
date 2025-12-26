from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import schemas
from ..utils.auth import get_current_user
from ..services.notification_service import notification_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("", response_model=List[schemas.Notification])
def get_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get notifications for current user role"""
    return notification_service.get_notifications(db, current_user.role, unread_only)

@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Mark notification as read"""
    notification_service.mark_as_read(db, notification_id)
    return {"message": "Notification marked as read"}

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get count of unread notifications"""
    notifications = notification_service.get_notifications(db, current_user.role, unread_only=True)
    return {"count": len(notifications)}