from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..utils.auth import authenticate_user, create_access_token
from ..models.schemas import Token
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str = "admin"

@router.post("/login", response_model=Token)
async def login_for_access_token(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.username, credentials.password, credentials.role or "admin")
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    identifier = user.email if credentials.role == "student" else credentials.username
    access_token = create_access_token(data={"sub": identifier, "role": credentials.role}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer", "user": user}


