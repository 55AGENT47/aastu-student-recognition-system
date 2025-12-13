from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import get_db, SessionLocal
from ..models import models, schemas
from ..utils.auth import get_password_hash
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from ..services.face_recognition_service import face_service

router = APIRouter(prefix="/api/registration", tags=["registration"])
logger = logging.getLogger(__name__)

class StudentRegistration(BaseModel):
    StudentIdentifier: str
    FirstName: str
    LastName: str
    Email: EmailStr
    Department: str
    EnrollmentYear: Optional[int] = None
    EnrollmentDate: Optional[str] = None
    CafeAccess: bool
    PhotoPath: Optional[str] = None
    Password: str

@router.post("/student", response_model=schemas.Student)
def register_student(
    registration: StudentRegistration,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    logger.debug("Register student request received: StudentIdentifier=%s Email=%s", getattr(registration, 'StudentIdentifier', None), getattr(registration, 'Email', None))
    existing_email = db.query(models.Student).filter(
        models.Student.Email == registration.Email
    ).first()
    if existing_email:
        return JSONResponse(
            status_code=400,
            content={"detail": "Email already registered"}
        )
    # Check for duplicate StudentIdentifier as well to avoid DB integrity errors
    existing_identifier = db.query(models.Student).filter(
        models.Student.StudentIdentifier == registration.StudentIdentifier
    ).first()
    if existing_identifier:
        return JSONResponse(
            status_code=400,
            content={"detail": "Student identifier already registered"}
        )
    hashed_password = get_password_hash(registration.Password)
    
    # Handle enrollment date
    enrollment_date = datetime.now()
    if registration.EnrollmentDate:
        try:
            enrollment_date = datetime.fromisoformat(registration.EnrollmentDate)
        except ValueError:
            enrollment_date = datetime.now()
    elif registration.EnrollmentYear:
        enrollment_date = datetime(registration.EnrollmentYear, 1, 1)
    
    db_student = models.Student(
        StudentIdentifier=registration.StudentIdentifier,
        FirstName=registration.FirstName,
        LastName=registration.LastName,
        Email=registration.Email,
        Department=registration.Department,
        EnrollmentYear=registration.EnrollmentYear,
        EnrollmentDate=enrollment_date,
        PhotoPath=registration.PhotoPath,
        CafeAccess=registration.CafeAccess,
        PasswordHash=hashed_password,
        IsActive=True
    )
    
    db.add(db_student)
    try:
        db.commit()
        try:
            db.refresh(db_student)
        except Exception:
            # If refresh fails (can happen with certain session/PK configs),
            # re-query the student from the database as a safe fallback.
            db_student = db.query(models.Student).filter(models.Student.Email == registration.Email).first()
    except IntegrityError as e:
        db.rollback()
        logger.exception("IntegrityError while creating student: %s", e)
        # Try to detect common unique constraint / duplicate messages from different DB backends
        error_msg = str(e.orig) if getattr(e, 'orig', None) is not None else str(e)
        low = error_msg.lower()
        if 'unique' in low or 'duplicate' in low or 'already exists' in low:
            if 'email' in low or registration.Email.lower() in low:
                return JSONResponse(status_code=400, content={"detail": "Email already registered"})
            if 'studentidentifier' in low or registration.StudentIdentifier.lower() in low or 'student_identifier' in low:
                return JSONResponse(status_code=400, content={"detail": "Student identifier already registered"})
            # Generic duplicate key
            return JSONResponse(status_code=400, content={"detail": "Duplicate value violates unique constraint"})

        # Return a generic message but log full error for debugging
        return JSONResponse(status_code=500, content={"detail": "Database integrity error. See server logs for details."})
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error creating student: %s", e)
        return JSONResponse(status_code=500, content={"detail": "Failed to create student. See server logs for details."})

    if registration.PhotoPath:
        try:
            if db_student:
                # Schedule background registration to avoid blocking the request
                def _bg_register(student_id, name, b64_image):
                    db_sess = SessionLocal()
                    try:
                        face_service.register_face(db=db_sess, student_id=student_id, name=name, base64_image=b64_image)
                        # Reload known faces into memory after registering
                        try:
                            face_service.load_known_faces_from_db(db_sess)
                        except Exception:
                            pass
                    finally:
                        db_sess.close()

                background_tasks.add_task(_bg_register, db_student.StudentID, f"{db_student.FirstName} {db_student.LastName}", registration.PhotoPath)
        except Exception as e:
            logger.exception("Error scheduling face registration for student %s: %s", getattr(db_student, 'StudentID', None), e)

    # Return a validated dict using Pydantic (avoids ORM->model conversion errors)
    try:
        student_response = schemas.Student.model_validate(db_student).model_dump()
    except Exception:
        # Fallback: build a simple dict to avoid serialization errors
        enrollment_date = getattr(db_student, 'EnrollmentDate', None)
        student_response = {
            "StudentID": getattr(db_student, 'StudentID', None),
            "StudentIdentifier": getattr(db_student, 'StudentIdentifier', None),
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

@router.get("/departments")
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