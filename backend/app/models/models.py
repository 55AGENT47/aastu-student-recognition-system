from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Student(Base):
    __tablename__ = "Students"
    StudentID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    StudentIdentifier = Column(String(50), nullable=False, unique=True)
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
    facial_profiles = relationship("FacialProfile", back_populates="student")
    event_logs = relationship("EventLog", back_populates="student")
    cafeteria_logs = relationship("CafeteriaLog", back_populates="student")
    known_faces = relationship("KnownFace", back_populates="student")

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
    StudentID = Column(Integer, ForeignKey("Students.StudentID"), nullable=False)
    FeatureVector = Column(LargeBinary, nullable=False)
    DateAdded = Column(DateTime, nullable=False, server_default=func.now())
    student = relationship("Student", back_populates="facial_profiles")

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

class EventLog(Base):
    __tablename__ = "EventLogs"
    LogID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    StudentID = Column(Integer, ForeignKey("Students.StudentID"))
    CameraID = Column(Integer, ForeignKey("Cameras.CameraID"), nullable=False)
    MatchScore = Column(Float)
    Decision = Column(Boolean)
    EventTime = Column(DateTime, server_default=func.now())
    student = relationship("Student", back_populates="event_logs")
    camera = relationship("Camera", back_populates="event_logs")

class CafeteriaLog(Base):
    __tablename__ = "CafeteriaLogs"
    LogID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    StudentID = Column(Integer, ForeignKey("Students.StudentID"))
    CameraID = Column(Integer, ForeignKey("Cameras.CameraID"))
    AccessTime = Column(DateTime, nullable=False, server_default=func.now())
    MatchScore = Column(Float)
    Decision = Column(Boolean, nullable=False)
    MealStatus = Column(String(50), default='meal not eaten')
    Notes = Column(String(255))
    student = relationship("Student", back_populates="cafeteria_logs")
    camera = relationship("Camera", back_populates="cafeteria_logs")