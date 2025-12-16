CREATE DATABASE IF NOT EXISTS FacialRecognitionDB;
USE FacialRecognitionDB;

CREATE TABLE IF NOT EXISTS Students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    StudentID VARCHAR(50) NOT NULL,
    FirstName VARCHAR(255) NOT NULL,
    LastName VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    Department VARCHAR(255),
    EnrollmentYear INT NULL,
    PhotoPath TEXT,
    FaceImagePath VARCHAR(500),
    PasswordHash VARCHAR(255) NULL,
    EnrollmentDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CafeAccess BOOLEAN DEFAULT FALSE,
    IsActive BOOLEAN DEFAULT TRUE,
    INDEX idx_email (Email),
    INDEX idx_student_id (StudentID)
) ENGINE=InnoDB;


UPDATE Students 
SET EnrollmentDate = STR_TO_DATE(CONCAT(EnrollmentYear, '-01-01'), '%Y-%m-%d')
WHERE EnrollmentDate = EnrollmentDate AND EnrollmentYear IS NOT NULL;

UPDATE Students 
SET EnrollmentDate = CURRENT_TIMESTAMP
WHERE EnrollmentYear IS NULL;
CREATE TABLE IF NOT EXISTS known_faces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image LONGBLOB NOT NULL,
    encoding LONGBLOB NOT NULL,
    student_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_student_id (student_id),
    CONSTRAINT fk_known_faces_students
        FOREIGN KEY (student_id)
        REFERENCES Students(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS FacialProfiles (
    ProfileID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID INT NOT NULL,
    FeatureVector LONGBLOB NOT NULL,
    DateAdded DATETIME NOT NULL,
    CONSTRAINT fk_FacialProfiles_Students
        FOREIGN KEY (StudentID)
        REFERENCES Students(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Cameras (
    CameraID INT AUTO_INCREMENT PRIMARY KEY,
    Location VARCHAR(255) NOT NULL,
    Resolution VARCHAR(50),
    IP_Address VARCHAR(45) UNIQUE,
    Status VARCHAR(50) DEFAULT 'Active'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Administrators (
    AdminID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName VARCHAR(255) NULL,
    LastLogin DATETIME,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS CafeteriaSecurity (
    SecurityID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName VARCHAR(255),
    LastLogin DATETIME,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS MainGateSecurity (
    SecurityID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName VARCHAR(255),
    LastLogin DATETIME,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS EventLogs (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID INT,
    CameraID INT NOT NULL,
    MatchScore FLOAT,
    Decision BOOLEAN,
    EventTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_EventLogs_Students
        FOREIGN KEY (StudentID)
        REFERENCES Students(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_EventLogs_Cameras
        FOREIGN KEY (CameraID)
        REFERENCES Cameras(CameraID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS CafeteriaLogs (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID INT,
    CameraID INT,
    AccessTime DATETIME NOT NULL,
    MatchScore FLOAT,
    Decision BOOLEAN NOT NULL,
    MealStatus VARCHAR(50) DEFAULT 'meal not eaten',
    Notes VARCHAR(255),
    CONSTRAINT fk_CafeteriaLogs_Students
        FOREIGN KEY (StudentID)
        REFERENCES Students(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_CafeteriaLogs_Cameras
        FOREIGN KEY (CameraID)
        REFERENCES Cameras(CameraID)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;


CREATE INDEX IF NOT EXISTS idx_students_email ON Students(Email);
CREATE INDEX IF NOT EXISTS idx_students_active ON Students(IsActive);
CREATE INDEX IF NOT EXISTS idx_admin_username ON Administrators(Username);
CREATE INDEX IF NOT EXISTS idx_cafeteria_username ON CafeteriaSecurity(Username);
CREATE INDEX IF NOT EXISTS idx_main_gate_username ON MainGateSecurity(Username);

-- Insert default users
INSERT IGNORE INTO Administrators (Username, PasswordHash, FullName, IsActive) 
VALUES ('admin@aastu.edu.et', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/SJx/6VO7u', 'Administrator', TRUE);

INSERT IGNORE INTO CafeteriaSecurity (Username, PasswordHash, FullName, IsActive) 
VALUES ('cafeteria@aastu.edu.et', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Cafeteria Security', TRUE);

INSERT IGNORE INTO MainGateSecurity (Username, PasswordHash, FullName, IsActive) 
VALUES ('security@aastu.edu.et', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Main Gate Security', TRUE);


-- Meal Schedule Table
CREATE TABLE IF NOT EXISTS MealSchedules (
    ScheduleID INT AUTO_INCREMENT PRIMARY KEY,
    MealName VARCHAR(50) NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_meal_name (MealName)
) ENGINE=InnoDB;

-- Insert default meal schedules
INSERT IGNORE INTO MealSchedules (MealName, StartTime, EndTime, IsActive) VALUES
('Breakfast', '07:00:00', '07:50:00', TRUE),
('Lunch', '12:00:00', '12:30:00', TRUE),
('Dinner', '17:00:00', '19:00:00', TRUE);

-- Modify CafeteriaLogs table to add meal tracking columns
ALTER TABLE CafeteriaLogs 
ADD COLUMN IF NOT EXISTS MealPeriod VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS IsDuplicateAttempt BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS FirstEntryTime DATETIME DEFAULT NULL,
ADD INDEX idx_access_date (AccessTime),
ADD INDEX idx_meal_period (MealPeriod);
