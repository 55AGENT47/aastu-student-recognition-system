from datetime import datetime, time
from typing import Optional

def get_meal_period(access_time: datetime, schedules: Optional[list] = None) -> str:
    """Determine meal period based on access time and schedules"""
    current_time = access_time.time()
    
    if schedules:
        for schedule in schedules:
            if not schedule.get('IsActive'):
                continue
            start_str = schedule['StartTime']
            end_str = schedule['EndTime']
            
            # Handle both HH:MM:SS and HH:MM formats
            try:
                start = datetime.strptime(start_str, '%H:%M:%S').time()
            except ValueError:
                start = datetime.strptime(start_str, '%H:%M').time()
            
            try:
                end = datetime.strptime(end_str, '%H:%M:%S').time()
            except ValueError:
                end = datetime.strptime(end_str, '%H:%M').time()
            
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
        return 'Outside Meal Hours'

