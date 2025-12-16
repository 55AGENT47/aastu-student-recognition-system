from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..utils.auth import authenticate_user, create_access_token, get_password_hash
from ..models.schemas import Token
from ..models.models import Student
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str = "admin"

class VerifyStudentRequest(BaseModel):
    email: str
    student_identifier: str

class ResetPasswordRequest(BaseModel):
    email: str
    student_identifier: str
    new_password: str

@router.post("/login", response_model=Token)
async def login_for_access_token(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.username, credentials.password, credentials.role or "admin")
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    identifier = user.email if credentials.role == "student" else credentials.username
    access_token = create_access_token(data={"sub": identifier, "role": credentials.role}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/verify-student")
async def verify_student(request: VerifyStudentRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(
        Student.Email == request.email,
        Student.StudentIdentifier == request.student_identifier,
        Student.IsActive == True
    ).first()
    
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found or invalid credentials")
    
    return {"message": "Student verified successfully"}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(
        Student.Email == request.email,
        Student.StudentIdentifier == request.student_identifier,
        Student.IsActive == True
    ).first()
    
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found or invalid credentials")
    
    setattr(student, 'PasswordHash', get_password_hash(request.new_password))
    db.commit()
    
    return {"message": "Password reset successfully"}

