from typing import List, cast, Union
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import distinct
from ..database import get_db, SessionLocal
from ..models import models, schemas
from ..utils.auth import get_current_user
from ..services.face_recognition_service import face_service

router = APIRouter(prefix="/api/students", tags=["students"])

@router.get("", response_model=List[schemas.Student])
def read_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
) -> List[models.Student]:
    students = db.query(models.Student).offset(skip).limit(limit).all()
    return students

@router.post("", response_model=schemas.Student)
def create_student(
    student: schemas.StudentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: schemas.User = Depends(get_current_user)
) -> models.Student:
    if db.query(models.Student).filter(models.Student.Email == student.Email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    db_student = models.Student(**student.dict())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    if student.PhotoPath is not None and student.PhotoPath != "":
        try:
            def _bg_register(student_id, name, b64_image):
                db_sess = SessionLocal()
                try:
                    face_service.register_face(db=db_sess, student_id=student_id, name=name, base64_image=b64_image)
                    try:
                        face_service.load_known_faces_from_db(db_sess)
                    except Exception:
                        pass
                finally:
                    db_sess.close()

            background_tasks.add_task(_bg_register, db_student.StudentID, f"{db_student.FirstName} {db_student.LastName}", student.PhotoPath)
        except Exception as e:
            print(f"Error scheduling face registration for student {db_student.StudentID}: {e}")
    
    return db_student

@router.get("/{student_id}", response_model=schemas.Student)
def read_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
) -> models.Student:
    db_student = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return db_student

@router.put("/{student_id}", response_model=schemas.Student)
def update_student(
    student_id: int, 
    student: schemas.StudentUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: schemas.User = Depends(get_current_user)
) -> models.Student:
    db_student = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.Email is not None and student.Email != db_student.Email:
        if db.query(models.Student).filter(models.Student.Email == student.Email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
    # Check if photo changed BEFORE updating
    old_photo = db_student.PhotoPath
    new_photo = student.PhotoPath if 'PhotoPath' in student.dict(exclude_unset=True) else old_photo
    photo_changed = (new_photo is not None) and (str(new_photo) != str(old_photo))
    photo_removed = (old_photo is not None) and (new_photo is None)
    
    update_data = student.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'EnrollmentDate' and value:
            try:
                enrollment_date = datetime.fromisoformat(value) if isinstance(value, str) else value
                setattr(db_student, field, enrollment_date)
            except ValueError:
                continue
        else:
            setattr(db_student, field, value)
    
    db.commit()
    db.refresh(db_student)
    
    if photo_removed:
        try:
            db.query(models.FacialProfile).filter(models.FacialProfile.StudentID == student_id).delete(synchronize_session=False)
            db.query(models.KnownFace).filter(models.KnownFace.student_id == student_id).delete(synchronize_session=False)
            db.commit()
        except Exception as e:
            print(f"Error deleting face data for student {db_student.StudentID}: {e}")
            db.rollback()
    elif photo_changed:
        try:
            # Delete old face data first
            db.query(models.FacialProfile).filter(models.FacialProfile.StudentID == student_id).delete(synchronize_session=False)
            db.query(models.KnownFace).filter(models.KnownFace.student_id == student_id).delete(synchronize_session=False)
            db.commit()
            
            def _bg_register_and_reload(student_id, name, b64_image):
                db_sess = SessionLocal()
                try:
                    face_service.register_face(db=db_sess, student_id=student_id, name=name, base64_image=b64_image)
                    try:
                        face_service.load_known_faces_from_db(db_sess)
                    except Exception:
                        pass
                finally:
                    db_sess.close()

            background_tasks.add_task(_bg_register_and_reload, db_student.StudentID, f"{db_student.FirstName} {db_student.LastName}", new_photo)
        except Exception as e:
            print(f"Error scheduling face registration for student {db_student.StudentID}: {e}")

    # If photo was removed we should reload known faces now (fast operation)
    try:
        face_service.load_known_faces_from_db(db)
    except Exception:
        pass
    
    return db_student

@router.delete("/{student_id}")
def delete_student(
    student_id: int, 
    db: Session = Depends(get_db), 
    current_user: schemas.User = Depends(get_current_user)
):
    db_student = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    try:
        # Delete related facial profiles and known faces first
        db.query(models.FacialProfile).filter(models.FacialProfile.StudentID == student_id).delete(synchronize_session=False)
        db.query(models.KnownFace).filter(models.KnownFace.student_id == student_id).delete(synchronize_session=False)

        # Finally delete the student record
        db.delete(db_student)
        db.commit()

        # Reload face recognition data after deletion
        try:
            face_service.load_known_faces_from_db(db)
        except Exception:
            # Non-fatal if face service fails to reload
            pass

        return {"message": "Student deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting student: {str(e)}")

@router.get("/departments", response_model=List[str])
def get_departments(db: Session = Depends(get_db)) -> List[str]:
    # Return a fixed list of allowed departments used for registration and updates
    return [
        "Architecture",
        "Civil Engineering",
        "Chemical Engineering",
        "Electrical & Computer Engineering",
        "Electromechanical Engineering",
        "Environmental Engineering",
        "Mechanical Engineering",
        "Mining Engineering",
        "Software Engineering",
        "Biotechnology",
        "Industrial Chemistry",
        "Geology",
        "Food Science & Applied Nutrition",
        "Mathematics",
        "Physics",
        "Statistics",
        "Social Science",
        "Business & Management",
        "Humanities Division"
    ]