from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models.models import Administrator, CafeteriaSecurity, MainGateSecurity
from ..utils.auth import get_password_hash, get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[UserResponse])
async def get_all_users(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    users = []
    
    for admin in db.query(Administrator).all():
        users.append(UserResponse(id=admin.AdminID, username=admin.Username, full_name=admin.FullName or "", role="admin", is_active=admin.IsActive))  # type: ignore
    
    for cafe in db.query(CafeteriaSecurity).all():
        users.append(UserResponse(id=cafe.SecurityID, username=cafe.Username, full_name=cafe.FullName or "", role="cafeteria", is_active=cafe.IsActive))  # type: ignore
    
    for gate in db.query(MainGateSecurity).all():
        users.append(UserResponse(id=gate.SecurityID, username=gate.Username, full_name=gate.FullName or "", role="main_gate", is_active=gate.IsActive))  # type: ignore
    
    return users

@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    hashed_password = get_password_hash(user.password)
    
    if user.role == "admin":
        if db.query(Administrator).filter(Administrator.Username == user.username).first():
            raise HTTPException(status_code=400, detail="Username already exists")
        new_user = Administrator(Username=user.username, PasswordHash=hashed_password, FullName=user.full_name)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return UserResponse(id=new_user.AdminID, username=new_user.Username, full_name=new_user.FullName, role="admin", is_active=new_user.IsActive)  # type: ignore
    
    elif user.role == "cafeteria":
        if db.query(CafeteriaSecurity).filter(CafeteriaSecurity.Username == user.username).first():
            raise HTTPException(status_code=400, detail="Username already exists")
        new_user = CafeteriaSecurity(Username=user.username, PasswordHash=hashed_password, FullName=user.full_name)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return UserResponse(id=new_user.SecurityID, username=new_user.Username, full_name=new_user.FullName, role="cafeteria", is_active=new_user.IsActive)  # type: ignore
    
    elif user.role == "main_gate":
        if db.query(MainGateSecurity).filter(MainGateSecurity.Username == user.username).first():
            raise HTTPException(status_code=400, detail="Username already exists")
        new_user = MainGateSecurity(Username=user.username, PasswordHash=hashed_password, FullName=user.full_name)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return UserResponse(id=new_user.SecurityID, username=new_user.Username, full_name=new_user.FullName, role="main_gate", is_active=new_user.IsActive)  # type: ignore
    
    raise HTTPException(status_code=400, detail="Invalid role")

@router.put("/{role}/{user_id}")
async def update_user(role: str, user_id: int, user_update: UserUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if role == "admin":
        user = db.query(Administrator).filter(Administrator.AdminID == user_id).first()
    elif role == "cafeteria":
        user = db.query(CafeteriaSecurity).filter(CafeteriaSecurity.SecurityID == user_id).first()
    elif role == "main_gate":
        user = db.query(MainGateSecurity).filter(MainGateSecurity.SecurityID == user_id).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.full_name is not None:
        user.FullName = user_update.full_name  # type: ignore
    if user_update.is_active is not None:
        user.IsActive = user_update.is_active  # type: ignore
    
    db.commit()
    return {"message": "User updated successfully"}

@router.delete("/{role}/{user_id}")
async def delete_user(role: str, user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if role == "admin":
        user = db.query(Administrator).filter(Administrator.AdminID == user_id).first()
    elif role == "cafeteria":
        user = db.query(CafeteriaSecurity).filter(CafeteriaSecurity.SecurityID == user_id).first()
    elif role == "main_gate":
        user = db.query(MainGateSecurity).filter(MainGateSecurity.SecurityID == user_id).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
