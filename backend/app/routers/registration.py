from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Body
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import get_db, SessionLocal
from ..models import models, schemas
from ..utils.auth import get_password_hash
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from ..services.face_recognition_service import face_service

router = APIRouter(prefix="/api", tags=["registration"])
logger = logging.getLogger(__name__)

class StudentRegistration(BaseModel):
    studentId: str = Field(alias='studentId')
    firstName: str = Field(alias='firstName')
    lastName: str = Field(alias='lastName')
    email: EmailStr = Field(alias='email')
    department: str = Field(alias='department')
    enrollmentYear: int = Field(alias='enrollmentYear')
    cafeAccess: bool = Field(alias='cafeAccess')
    photo: str = Field(alias='photo')
    password: str = Field(alias='password')
    
    model_config = {'populate_by_name': True}
    
    @property
    def StudentIdentifier(self):
        return self.studentId
    
    @property
    def FirstName(self):
        return self.firstName
    
    @property
    def LastName(self):
        return self.lastName
    
    @property
    def Email(self):
        return self.email
    
    @property
    def Department(self):
        return self.department
    
    @property
    def EnrollmentYear(self):
        return self.enrollmentYear
    
    @property
    def CafeAccess(self):
        return self.cafeAccess
    
    @property
    def PhotoPath(self):
        return self.photo
    
    @property
    def Password(self):
        return self.password
    
    @property
    def EnrollmentDate(self):
        return None

@router.post("/registration/student")
async def register_student(
    request: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    studentId = request.get('studentIdentifier') or request.get('studentId')
    firstName = request.get('FirstName') or request.get('firstName')
    lastName = request.get('LastName') or request.get('lastName')
    email = request.get('Email') or request.get('email')
    department = request.get('Department') or request.get('department')
    enrollmentYear = request.get('EnrollmentYear') or request.get('enrollmentYear')
    cafeAccess = request.get('CafeAccess', False) or request.get('cafeAccess', False)
    photo = request.get('PhotoPath') or request.get('photo')
    password = request.get('Password') or request.get('password', 'default123')
    
    logger.debug(f"Received data: {request}")
    
    if not studentId or not firstName or not lastName or not email:
        return JSONResponse(status_code=400, content={"detail": f"Missing required fields. Received: {list(request.keys())}"})
    
    logger.debug("Register student request received: StudentIdentifier=%s Email=%s", studentId, email)
    existing_email = db.query(models.Student).filter(
        models.Student.Email == email
    ).first()
    if existing_email:
        return JSONResponse(
            status_code=400,
            content={"detail": "Email already registered"}
        )
    existing_identifier = db.query(models.Student).filter(
        models.Student.StudentID == studentId
    ).first()
    if existing_identifier:
        return JSONResponse(
            status_code=400,
            content={"detail": "Student identifier already registered"}
        )
    hashed_password = get_password_hash(password)
    
    enrollment_date = datetime(enrollmentYear or 2024, 1, 1)
    
    db_student = models.Student(
        StudentID=studentId,
        FirstName=firstName,
        LastName=lastName,
        Email=email,
        Department=department,
        EnrollmentYear=enrollmentYear,
        EnrollmentDate=enrollment_date,
        PhotoPath=photo,
        CafeAccess=cafeAccess,
        PasswordHash=hashed_password,
        IsActive=False
    )
    
    db.add(db_student)
    try:
        db.commit()
        try:
            db.refresh(db_student)
        except Exception:
            # If refresh fails (can happen with certain session/PK configs),
            # re-query the student from the database as a safe fallback.
            db_student = db.query(models.Student).filter(models.Student.Email == email).first()
            if not db_student:
                db.rollback()
                return JSONResponse(status_code=500, content={"detail": "Failed to retrieve created student"})
    except IntegrityError as e:
        db.rollback()
        logger.exception("IntegrityError while creating student: %s", e)
        # Try to detect common unique constraint / duplicate messages from different DB backends
        error_msg = str(e.orig) if getattr(e, 'orig', None) is not None else str(e)
        low = error_msg.lower()
        if 'unique' in low or 'duplicate' in low or 'already exists' in low:
            if 'email' in low or email.lower() in low:
                return JSONResponse(status_code=400, content={"detail": "Email already registered"})
            if 'studentidentifier' in low or studentId.lower() in low or 'student_identifier' in low:
                return JSONResponse(status_code=400, content={"detail": "Student identifier already registered"})
            # Generic duplicate key
            return JSONResponse(status_code=400, content={"detail": "Duplicate value violates unique constraint"})

        # Return a generic message but log full error for debugging
        return JSONResponse(status_code=500, content={"detail": "Database integrity error. See server logs for details."})
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error creating student: %s", e)
        return JSONResponse(status_code=500, content={"detail": "Failed to create student. See server logs for details."})

    if photo:
        try:
            if db_student:
                def _bg_register(student_varchar_id, name, b64_image):
                    db_sess = SessionLocal()
                    try:
                        student = db_sess.query(models.Student).filter(models.Student.StudentID == student_varchar_id).first()
                        if student:
                            face_service.register_face(db=db_sess, student_id=student.id, name=name, base64_image=b64_image)
                            try:
                                face_service.load_known_faces_from_db(db_sess)
                            except Exception:
                                pass
                    finally:
                        db_sess.close()

                if background_tasks:
                    background_tasks.add_task(_bg_register, db_student.StudentID, f"{firstName} {lastName}", photo)
        except Exception as e:
            logger.exception("Error scheduling face registration for student %s: %s", getattr(db_student, 'StudentID', None), e)

    # Return a validated dict using Pydantic (avoids ORM->model conversion errors)
    try:
        student_response = {
            "StudentID": str(db_student.StudentID),
            "FirstName": db_student.FirstName,
            "LastName": db_student.LastName,
            "Email": db_student.Email,
            "Department": db_student.Department,
            "EnrollmentYear": db_student.EnrollmentYear,
            "EnrollmentDate": db_student.EnrollmentDate.isoformat() if db_student.EnrollmentDate is not None else None,
            "PhotoPath": db_student.PhotoPath,
            "FaceImagePath": db_student.FaceImagePath,
            "CafeAccess": db_student.CafeAccess,
            "IsActive": db_student.IsActive,
        }
    except Exception:
        # Fallback: build a simple dict to avoid serialization errors
        enrollment_date = getattr(db_student, 'EnrollmentDate', None)
        student_response = {
            "StudentID": str(getattr(db_student, 'StudentID', None)),
            "FirstName": getattr(db_student, 'FirstName', None),
            "LastName": getattr(db_student, 'LastName', None),
            "Email": getattr(db_student, 'Email', None),
            "Department": getattr(db_student, 'Department', None),
            "EnrollmentYear": getattr(db_student, 'EnrollmentYear', None),
            "EnrollmentDate": enrollment_date.isoformat() if enrollment_date else None,
            "PhotoPath": getattr(db_student, 'PhotoPath', None),
            "FaceImagePath": getattr(db_student, 'FaceImagePath', None),
            "CafeAccess": getattr(db_student, 'CafeAccess', False),
            "IsActive": getattr(db_student, 'IsActive', True),
        }

    # Ensure all values (e.g., datetimes) are JSON serializable
    safe_content = jsonable_encoder(student_response)
    return JSONResponse(status_code=201, content=safe_content)

@router.get("/registration/departments")
def get_departments():
    """Get list of available departments"""
    departments = [
        "Architecture",
        "Civil Engineering",
        "Chemical Engineering",
        "Electrical & Computer Engineering",
        "Mechanical Engineering",
        "Electromechanical Engineering",
        "Environmental Engineering",
        "Mining Engineering",
        "Software Engineering",
        "Biotechnology",
        "Industrial Chemistry",
        "Geology",
        "Food Science & Applied Nutrition",
        "Mathematics",
        "Physics",
        "Industrial Management",
        "Engineering Management",
    ]
    return {"departments": departments}

@router.get("/registration/pending-students")
def get_pending_students(db: Session = Depends(get_db)):
    pending = db.query(models.Student).filter(models.Student.IsActive == False).all()
    return [{
        "StudentID": s.StudentID,
        "FirstName": s.FirstName,
        "LastName": s.LastName,
        "Email": s.Email,
        "Department": s.Department,
        "EnrollmentYear": s.EnrollmentYear,
        "EnrollmentDate": s.EnrollmentDate.isoformat() if s.EnrollmentDate is not None else None,
        "CafeAccess": s.CafeAccess,
        "PhotoPath": s.PhotoPath
    } for s in pending]

@router.post("/registration/approve/{student_id}")
def approve_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    setattr(student, 'IsActive', True)
    db.commit()
    return {"message": "Student approved successfully"}

@router.post("/registration/reject/{student_id}")
def reject_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Track rejected student before deletion
    rejected_record = models.RejectedStudent(
        email=student.Email,
        student_id=student.StudentID
    )
    db.add(rejected_record)
    
    db.delete(student)
    db.commit()
    return {"message": "Student rejected successfully"}