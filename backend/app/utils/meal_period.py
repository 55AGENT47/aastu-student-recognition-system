from datetime import datetime, time

def get_meal_period(access_time: datetime) -> str:
    """Determine meal period based on access time"""
    current_time = access_time.time()
    hour = current_time.hour
    
    # Default fallback based on time of day
    if 6 <= hour < 10:
        return 'Breakfast'
    elif 11 <= hour < 15:
        return 'Lunch'
    elif 17 <= hour < 21:
        return 'Dinner'
    else:
        return 'Unknown'

