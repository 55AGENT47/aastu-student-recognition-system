from sqlalchemy.orm import Session
from ..models import models
from datetime import datetime

class NotificationService:
    def create_duplicate_entry_alert(self, db: Session, student_name: str, student_id: int, log_id: int):
        """Create notification for duplicate cafeteria entry"""
        # Alert for admin
        admin_notification = models.Notification(
            title="Duplicate Cafeteria Entry Detected",
            message=f"Student {student_name} attempted duplicate cafeteria entry",
            type="duplicate_entry",
            target_role="admin",
            student_id=student_id,
            log_id=log_id
        )
        db.add(admin_notification)
        
        # Alert for cafeteria security
        cafeteria_notification = models.Notification(
            title="Duplicate Entry Alert",
            message=f"Student {student_name} attempted duplicate entry",
            type="duplicate_entry", 
            target_role="cafeteria",
            student_id=student_id,
            log_id=log_id
        )
        db.add(cafeteria_notification)
        db.commit()

    def get_notifications(self, db: Session, role: str, unread_only: bool = False):
        """Get notifications for specific role"""
        query = db.query(models.Notification).filter(
            models.Notification.target_role.in_([role, 'all'])
        )
        
        if unread_only:
            query = query.filter(models.Notification.is_read == False)
            
        return query.order_by(models.Notification.created_at.desc()).all()

    def mark_as_read(self, db: Session, notification_id: int):
        """Mark notification as read"""
        notification = db.query(models.Notification).filter(
            models.Notification.id == notification_id
        ).first()
        
        if notification:
            setattr(notification, 'is_read', True)
            db.commit()

notification_service = NotificationService()