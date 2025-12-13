from fastapi import FastAPI, Depends, HTTPException, Form
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from .database import get_db, engine
from .models import models
from .routers import auth, students, cameras, logs, stats, face_recognition, registration, images
from .utils.auth import get_password_hash
from .services.face_recognition_service import face_service
from .models.schemas import FaceValidationResponse
import os

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="Student Recognition System API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

if not os.path.exists("uploads"):
    os.makedirs("uploads")
    os.makedirs("uploads/faces")
    os.makedirs("uploads/photos")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

for router in [auth.router, students.router, cameras.router, logs.router, stats.router, face_recognition.router, registration.router, images.router]:
    app.include_router(router)

@app.post("/api/validate-face", response_model=FaceValidationResponse)
async def validate_face_compat(image_data: str = Form(...)):
    try:
        return FaceValidationResponse(**face_service.validate_face(image_data))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class VerifyRequest(BaseModel):
    image_data: str
    camera_id: int = 1


@app.post("/api/verify")
async def verify_face_compat(request: VerifyRequest, db: Session = Depends(get_db)):
    try:
        from datetime import datetime
        result = face_service.verify_face(db, request.image_data)
        result["timestamp"] = datetime.now().isoformat()

        student_id = result["student"]["StudentID"] if result.get("student") else None
        match_score = result.get("confidence", 0.0)
        decision = bool(result.get("access_granted", False)) if student_id else False

        camera = db.query(models.Camera).filter(models.Camera.CameraID == request.camera_id).first()
        if not camera:
            camera = models.Camera(CameraID=request.camera_id, Location=f"Camera {request.camera_id}", Resolution="", Status="Active")
            db.add(camera)
            db.commit()
            db.refresh(camera)

        if str(camera.Location) == "Cafeteria":
            if student_id:
                student = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
                if student and not bool(getattr(student, 'CafeAccess', False)):
                    decision = False
                    result['access_granted'] = False
                    result['message'] = 'Student access disabled by the Administrator'
                else:
                    result['access_granted'] = True
            
            db.add(models.CafeteriaLog(
                StudentID=student_id,
                CameraID=request.camera_id,
                MatchScore=match_score,
                Decision=decision,
                MealStatus="meal eaten" if decision else "meal not eaten"
            ))

        if camera:
            db.add(models.EventLog(
                StudentID=student_id,
                CameraID=request.camera_id,
                MatchScore=match_score,
                Decision=bool(result.get('access_granted', False))
            ))
        db.commit()
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/init-admin")
async def initialize_admin(db: Session = Depends(get_db)):
    try:
        if db.query(models.Administrator).first():
            if db.query(models.Camera).count() == 0:
                for location in ["Main Gate", "Cafeteria", "Library"]:
                    db.add(models.Camera(Location=location, Resolution="1920x1080", Status="Active"))
                db.commit()
            return {"message": "Users already initialized"}
        
        users = [
            (models.Administrator, "admin@aastu.edu.et", "admin123", "System Administrator"),
            (models.CafeteriaSecurity, "cafeteria@aastu.edu.et", "cafe123", "Cafeteria Security"),
            (models.MainGateSecurity, "security@aastu.edu.et", "sec123", "Main Security")
        ]
        
        for model_class, username, password, full_name in users:
            db.add(model_class(Username=username, PasswordHash=get_password_hash(password), FullName=full_name, IsActive=True))
        
        for location in ["Main Gate", "Cafeteria", "Library"]:
            db.add(models.Camera(Location=location, Resolution="1920x1080", Status="Active"))
        
        db.commit()
        return {
            "message": "All users initialized successfully",
            "users": [
                {"username": "admin@aastu.edu.et", "password": "admin123", "role": "admin"},
                {"username": "cafeteria@aastu.edu.et", "password": "cafe123", "role": "cafeteria"},
                {"username": "security@aastu.edu.et", "password": "sec123", "role": "main_gate"}
            ]
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error initializing users: {str(e)}")

@app.on_event("startup")
async def startup_event():
    from .database import test_database_connection
    test_database_connection()
    try:
        face_service.load_known_faces_from_db(next(get_db()))
        print("Face recognition service initialized")
    except Exception as e:
        print(f"Error initializing face recognition service: {e}")

@app.get("/")
async def root():
    return {"message": "Student Recognition System API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}