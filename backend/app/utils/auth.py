from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from ..config import settings
from ..database import get_db
from ..models.models import Administrator, CafeteriaSecurity, MainGateSecurity, Student, RegistrarOfficer, RejectedStudent
from ..models.schemas import TokenData, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
security = HTTPBearer()
# Optional bearer security for endpoints that accept anonymous access
security_optional = HTTPBearer(auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        username = payload.get("sub")
        role = payload.get("role")
        if username is None or role is None:
            raise credentials_exception
        token_data = TokenData(username=str(username), role=str(role))
    except JWTError:
        raise credentials_exception
    return token_data


def verify_token_optional(credentials: HTTPAuthorizationCredentials = Depends(security_optional)):
    """Verify token if present, otherwise return None (no exception for missing header)."""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        username = payload.get("sub")
        role = payload.get("role")
        if username is None or role is None:
            return None
        return TokenData(username=str(username), role=str(role))
    except JWTError:
        return None

def get_current_user(token_data: TokenData = Depends(verify_token), db: Session = Depends(get_db)):
    if token_data.username is None or token_data.role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token data",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = get_user_by_username_and_role(db, username=token_data.username, role=token_data.role)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_user_optional(token_data: TokenData = Depends(verify_token_optional), db: Session = Depends(get_db)):
    """Return current user if token provided and valid, otherwise return None."""
    if token_data is None or token_data.username is None or token_data.role is None:
        return None
    user = get_user_by_username_and_role(db, username=token_data.username, role=token_data.role)
    if user is None:
        return None
    return user

def get_user_by_username_and_role(db: Session, username: str, role: str):
    if role == "admin":
        user_db = db.query(Administrator).filter(Administrator.Username == username, Administrator.IsActive == True).first()
        if user_db:
            return User(
                id=str(user_db.AdminID),
                email=username,
                role="admin",
                name=str(user_db.FullName) if user_db.FullName is not None else username
            )
    elif role == "cafeteria":
        user_db = db.query(CafeteriaSecurity).filter(CafeteriaSecurity.Username == username, CafeteriaSecurity.IsActive == True).first()
        if user_db:
            return User(
                id=str(user_db.SecurityID),
                email=username,
                role="cafeteria",
                name=str(user_db.FullName) if user_db.FullName is not None else username
            )
    elif role == "main_gate":
        user_db = db.query(MainGateSecurity).filter(MainGateSecurity.Username == username, MainGateSecurity.IsActive == True).first()
        if user_db:
            return User(
                id=str(user_db.SecurityID),
                email=username,
                role="main_gate",
                name=str(user_db.FullName) if user_db.FullName is not None else username
            )
    elif role == "registrar":
        user_db = db.query(RegistrarOfficer).filter(RegistrarOfficer.Username == username, RegistrarOfficer.IsActive == True).first()
        if user_db:
            return User(
                id=str(user_db.OfficerID),
                email=username,
                role="registrar",
                name=str(user_db.FullName) if user_db.FullName is not None else username
            )
    elif role == "student":
        user_db = db.query(Student).filter(Student.Email == username, Student.IsActive == True).first()
        if user_db:
            return User(
                id=str(user_db.StudentID),
                email=str(user_db.Email),
                role="student",
                name=f"{user_db.FirstName or ''} {user_db.LastName or ''}".strip()
            )
    return None

def authenticate_user(db: Session, username: str, password: str, role: str):
    if role == "admin":
        user = db.query(Administrator).filter(Administrator.Username == username, Administrator.IsActive == True).first()
        if not user or not verify_password(password, user.PasswordHash):
            return False
        return User(
            id=str(user.AdminID),
            email=username,
            role="admin",
            name=str(user.FullName) if user.FullName is not None else username
        )
    elif role == "cafeteria":
        user = db.query(CafeteriaSecurity).filter(CafeteriaSecurity.Username == username, CafeteriaSecurity.IsActive == True).first()
        if not user or not verify_password(password, user.PasswordHash):
            return False
        return User(
            id=str(user.SecurityID),
            email=username,
            role="cafeteria",
            name=str(user.FullName) if user.FullName is not None else username
        )
    elif role == "main_gate":
        user = db.query(MainGateSecurity).filter(MainGateSecurity.Username == username, MainGateSecurity.IsActive == True).first()
        if not user or not verify_password(password, user.PasswordHash):
            return False
        return User(
            id=str(user.SecurityID),
            email=username,
            role="main_gate",
            name=str(user.FullName) if user.FullName is not None else username
        )
    elif role == "registrar":
        user = db.query(RegistrarOfficer).filter(RegistrarOfficer.Username == username, RegistrarOfficer.IsActive == True).first()
        if not user or not verify_password(password, user.PasswordHash):
            return False
        return User(
            id=str(user.OfficerID),
            email=username,
            role="registrar",
            name=str(user.FullName) if user.FullName is not None else username
        )
    elif role == "student":
        user = db.query(Student).filter(Student.Email == username).first()
        if not user:
            rejected = db.query(RejectedStudent).filter(RejectedStudent.email == username).first()
            if rejected:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect username or password. You are rejected by registrar officer."
                )
            return False
        if user.IsActive is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your registration is pending approval by the Registrar Officer. Please wait for approval."
            )
        if user.PasswordHash is None or not verify_password(password, str(user.PasswordHash)):
            return False
        return User(
            id=str(user.StudentID),
            email=str(user.Email),
            role="student",
            name=f"{user.FirstName or ''} {user.LastName or ''}".strip()
        )
    return False