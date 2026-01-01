import sys
sys.path.append('d:\\MY WORKS\\Student Recognition System\\backend')

from app.database import SessionLocal
from app.models import models

db = SessionLocal()

# Check if Notifications table exists
try:
    count = db.query(models.Notification).count()
    print(f"Notifications table exists with {count} records")
    
    # Get notification 12
    notif = db.query(models.Notification).filter(models.Notification.id == 12).first()
    if notif:
        print(f"Notification 12 found:")
        print(f"  Type: {notif.type}")
        print(f"  Log ID: {notif.log_id}")
        print(f"  Target Role: {notif.target_role}")
    else:
        print("Notification 12 not found")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

db.close()
