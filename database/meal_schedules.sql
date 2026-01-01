USE student_recognition;

CREATE TABLE IF NOT EXISTS MealSchedules (
    ScheduleID INT AUTO_INCREMENT PRIMARY KEY,
    MealName VARCHAR(50) NOT NULL,
    StartTime VARCHAR(10) NOT NULL,
    EndTime VARCHAR(10) NOT NULL,
    IsActive BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

INSERT INTO MealSchedules (MealName, StartTime, EndTime, IsActive) VALUES
('Breakfast', '06:00:00', '10:00:00', TRUE),
('Lunch', '11:00:00', '15:00:00', TRUE),
('Dinner', '17:00:00', '21:00:00', TRUE)
ON DUPLICATE KEY UPDATE MealName=MealName;
