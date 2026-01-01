import sys
sys.path.append('d:\\MY WORKS\\Student Recognition System\\backend')

from app.database import SessionLocal
from app.models import models
from datetime import datetime

db = SessionLocal()

# Get recent cafeteria logs
logs = db.query(models.CafeteriaLog).order_by(models.CafeteriaLog.AccessTime.desc()).limit(10).all()

print("Recent Cafeteria Logs:")
for log in logs:
    print(f"\nLogID: {log.LogID}")
    print(f"  StudentID: {log.StudentID}")
    print(f"  AccessTime: {log.AccessTime}")
    print(f"  MealPeriod: {log.MealPeriod}")
    print(f"  MealStatus: {log.MealStatus}")
    print(f"  Notes: {log.Notes}")

db.close()
