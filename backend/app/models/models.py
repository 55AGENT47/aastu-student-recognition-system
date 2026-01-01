from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Student(Base):
    __tablename__ = "Students"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    StudentID = Column(String(50), nullable=False, unique=True, index=True)
    FirstName = Column(String(255), nullable=False)
    LastName = Column(String(255), nullable=False)
    Email = Column(String(255), unique=True, nullable=False, index=True)
    Department = Column(String(255))
    EnrollmentYear = Column(Integer)
    EnrollmentDate = Column(DateTime, nullable=False, server_default=func.now())
    PhotoPath = Column(String(500))
    FaceImagePath = Column(String(500))
    PasswordHash = Column(String(255))
    CafeAccess = Column(Boolean, default=False)
    IsActive = Column(Boolean, default=True)
    facial_profiles = relationship("FacialProfile", back_populates="student", foreign_keys="FacialProfile.StudentID")
    event_logs = relationship("EventLog", back_populates="student", foreign_keys="EventLog.StudentID")
    cafeteria_logs = relationship("CafeteriaLog", back_populates="student", foreign_keys="CafeteriaLog.StudentID")
    known_faces = relationship("KnownFace", back_populates="student", foreign_keys="KnownFace.student_id")

class KnownFace(Base):
    __tablename__ = "known_faces"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    image = Column(LargeBinary, nullable=False)
    encoding = Column(LargeBinary, nullable=False)
    student_id = Column(Integer, ForeignKey("Students.StudentID"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    student = relationship("Student", back_populates="known_faces")

class FacialProfile(Base):
    __tablename__ = "FacialProfiles"
    ProfileID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    StudentID = Column(Integer, ForeignKey("Students.id"), nullable=False)
    FeatureVector = Column(LargeBinary, nullable=False)
    DateAdded = Column(DateTime, nullable=False, server_default=func.now())
    student = relationship("Student", back_populates="facial_profiles", foreign_keys=[StudentID])

class Camera(Base):
    __tablename__ = "Cameras"
    CameraID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Location = Column(String(255), nullable=False)
    Resolution = Column(String(50))
    IP_Address = Column(String(45), unique=True)
    Status = Column(String(50), default="Active")
    event_logs = relationship("EventLog", back_populates="camera")
    cafeteria_logs = relationship("CafeteriaLog", back_populates="camera")

class Administrator(Base):
    __tablename__ = "Administrators"
    AdminID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Username = Column(String(255), unique=True, nullable=False, index=True)
    PasswordHash = Column(String(255), nullable=False)
    FullName = Column(String(255))
    LastLogin = Column(DateTime)
    IsActive = Column(Boolean, default=True)
    CreatedAt = Column(DateTime, server_default=func.now())

class CafeteriaSecurity(Base):
    __tablename__ = "CafeteriaSecurity"
    SecurityID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Username = Column(String(255), unique=True, nullable=False, index=True)
    PasswordHash = Column(String(255), nullable=False)
    FullName = Column(String(255))
    LastLogin = Column(DateTime)
    IsActive = Column(Boolean, default=True)
    CreatedAt = Column(DateTime, server_default=func.now())

class MainGateSecurity(Base):
    __tablename__ = "MainGateSecurity"
    SecurityID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Username = Column(String(255), unique=True, nullable=False, index=True)
    PasswordHash = Column(String(255), nullable=False)
    FullName = Column(String(255))
    LastLogin = Column(DateTime)
    IsActive = Column(Boolean, default=True)
    CreatedAt = Column(DateTime, server_default=func.now())

class RegistrarOfficer(Base):
    __tablename__ = "RegistrarOfficer"
    OfficerID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Username = Column(String(255), unique=True, nullable=False, index=True)
    PasswordHash = Column(String(255), nullable=False)
    FullName = Column(String(255))
    LastLogin = Column(DateTime)
    IsActive = Column(Boolean, default=True)
    CreatedAt = Column(DateTime, server_default=func.now())

class EventLog(Base):
    __tablename__ = "EventLogs"
    LogID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    StudentID = Column(Integer, ForeignKey("Students.id"))
    CameraID = Column(Integer, ForeignKey("Cameras.CameraID"), nullable=False)
    MatchScore = Column(Float)
    Decision = Column(Boolean)
    EventTime = Column(DateTime, server_default=func.now())
    student = relationship("Student", back_populates="event_logs", foreign_keys=[StudentID])
    camera = relationship("Camera", back_populates="event_logs")

class CafeteriaLog(Base):
    __tablename__ = "CafeteriaLogs"
    LogID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    StudentID = Column(Integer, ForeignKey("Students.id"))
    CameraID = Column(Integer, ForeignKey("Cameras.CameraID"))
    AccessTime = Column(DateTime, nullable=False, server_default=func.now())
    MatchScore = Column(Float)
    Decision = Column(Boolean, nullable=False)
    MealStatus = Column(String(50), default='meal not eaten')
    MealPeriod = Column(String(50), nullable=True)
    Notes = Column(String(255))
    student = relationship("Student", back_populates="cafeteria_logs", foreign_keys=[StudentID])
    camera = relationship("Camera", back_populates="cafeteria_logs")

class PasswordResetOTP(Base):
    __tablename__ = "PasswordResetOTP"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), nullable=False, index=True)
    otp_code = Column(String(6), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)

class RejectedStudent(Base):
    __tablename__ = "RejectedStudents"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), nullable=False, index=True)
    student_id = Column(String(50), nullable=False)
    rejected_at = Column(DateTime, server_default=func.now())

class Notification(Base):
    __tablename__ = "Notifications"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    message = Column(String(500), nullable=False)
    type = Column(String(50), default='system')
    target_role = Column(String(50), nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    student_id = Column(Integer, ForeignKey("Students.id"), nullable=True)
    log_id = Column(Integer, ForeignKey("CafeteriaLogs.LogID"), nullable=True)
