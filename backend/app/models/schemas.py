from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class StudentBase(BaseModel):
    StudentIdentifier: str
    FirstName: str
    LastName: str
    Email: EmailStr
    Department: Optional[str] = None
    EnrollmentYear: Optional[int] = None
    EnrollmentDate: Optional[str] = None
    PhotoPath: Optional[str] = None
    FaceImagePath: Optional[str] = None
    CafeAccess: Optional[bool] = False

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    StudentIdentifier: Optional[str] = None
    FirstName: Optional[str] = None
    LastName: Optional[str] = None
    Email: Optional[EmailStr] = None
    Department: Optional[str] = None
    EnrollmentYear: Optional[int] = None
    EnrollmentDate: Optional[str] = None
    PhotoPath: Optional[str] = None
    FaceImagePath: Optional[str] = None
    CafeAccess: Optional[bool] = None

class Student(BaseModel):
    StudentID: str
    FirstName: str
    LastName: str
    Email: EmailStr
    Department: Optional[str] = None
    EnrollmentYear: Optional[int] = None
    EnrollmentDate: Optional[datetime] = None
    PhotoPath: Optional[str] = None
    FaceImagePath: Optional[str] = None
    CafeAccess: Optional[bool] = False
    IsActive: bool
    
    model_config = {
        "from_attributes": True
    }

class CameraBase(BaseModel):
    Location: str
    Resolution: Optional[str] = None
    IP_Address: Optional[str] = None

class CameraCreate(CameraBase):
    pass

class CameraUpdate(CameraBase):
    pass

class Camera(CameraBase):
    CameraID: int
    Status: str
    
    model_config = {
        "from_attributes": True
    }

class EventLogBase(BaseModel):
    StudentID: Optional[str] = None
    CameraID: int
    MatchScore: Optional[float] = None
    Decision: Optional[bool] = None

class EventLogCreate(EventLogBase):
    pass

class EventLog(EventLogBase):
    LogID: int
    EventTime: datetime
    FirstName: Optional[str] = None
    LastName: Optional[str] = None
    PhotoPath: Optional[str] = None
    CameraLocation: Optional[str] = None
    
    model_config = {
        "from_attributes": True
    }

class CafeteriaLogBase(BaseModel):
    StudentID: Optional[str] = None
    CameraID: Optional[int] = None
    MatchScore: Optional[float] = None
    Decision: bool
    MealStatus: Optional[str] = 'meal not eaten'
    MealPeriod: Optional[str] = None
    Notes: Optional[str] = None

class CafeteriaLogCreate(CafeteriaLogBase):
    pass

class CafeteriaLog(CafeteriaLogBase):
    LogID: int
    AccessTime: datetime
    FirstName: Optional[str] = None
    LastName: Optional[str] = None
    PhotoPath: Optional[str] = None
    CameraLocation: Optional[str] = None
    MealPeriod: Optional[str] = None
    
    model_config = {
        "from_attributes": True
    }

class User(BaseModel):
    id: str
    email: str
    role: str
    name: str

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class FaceValidationResponse(BaseModel):
    face_detected: bool
    message: str
    face_count: int

class FaceRegistrationResponse(BaseModel):
    success: bool
    message: str

class VerificationResult(BaseModel):
    success: bool
    student: Optional[dict] = None
    confidence: float
    timestamp: str
    access_granted: bool
    message: Optional[str] = None

class FaceDetectionResult(BaseModel):
    faces: List[dict]
    timestamp: str

class StatsResponse(BaseModel):
    totalStudents: int
    todayAccess: int
    successRate: float
    activePoints: int
    recentTrend: float

class KnownFaceResponse(BaseModel):
    id: int
    name: str
    student_id: Optional[int] = None
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = 'system'
    target_role: str
    student_id: Optional[int] = None
    log_id: Optional[int] = None

class Notification(BaseModel):
    id: int
    title: str
    message: str
    type: str
    target_role: str
    is_read: bool
    created_at: datetime
    student_id: Optional[int] = None
    log_id: Optional[int] = None
    
    model_config = {
        "from_attributes": True
    }