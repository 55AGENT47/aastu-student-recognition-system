from datetime import datetime, time
from typing import Optional

def get_meal_period(access_time: datetime, schedules: Optional[list] = None) -> str:
    """Determine meal period based on access time and schedules"""
    current_time = access_time.time()
    
    if schedules:
        for schedule in schedules:
            if not schedule.get('IsActive'):
                continue
            start = datetime.strptime(schedule['StartTime'], '%H:%M:%S').time()
            end = datetime.strptime(schedule['EndTime'], '%H:%M:%S').time()
            if start <= current_time <= end:
                return schedule['MealName']
    
    # Default fallback based on time of day
    hour = current_time.hour
    if 6 <= hour < 10:
        return 'Breakfast'
    elif 11 <= hour < 15:
        return 'Lunch'
    elif 17 <= hour < 21:
        return 'Dinner'
    else:
        return 'Unknown'

