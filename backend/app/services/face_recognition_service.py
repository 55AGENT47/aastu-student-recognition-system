import face_recognition
import numpy as np
import base64
import pickle
from typing import Tuple, Optional, Dict
from PIL import Image
from io import BytesIO
from sqlalchemy.orm import Session
from ..models.models import KnownFace, Student

class FaceRecognitionService:
    def __init__(self):
        self.known_encodings = []
        self.known_names = []
        self.known_student_ids = []
        self.tolerance = 0.5
        self._initialized = False
        
    def load_known_faces_from_db(self, db: Session):
        try:
            known_faces = db.query(KnownFace).all()
            self.known_encodings, self.known_names, self.known_student_ids = [], [], []
            
            for face in known_faces:
                try:
                    encoding_data = face.encoding
                    if encoding_data is not None:
                        # Type ignore for SQLAlchemy Column type
                        self.known_encodings.append(pickle.loads(encoding_data))  # type: ignore
                        self.known_names.append(str(face.name))
                        self.known_student_ids.append(face.student_id)
                except Exception as e:
                    print(f"Error loading face encoding for {face.name}: {e}")
                    
            
            if len(self.known_encodings) > 0:
                print(f"Loaded {len(self.known_encodings)} known faces from database")
            else:
                print("No known faces loaded from database")
                
            return True
        except Exception as e:
            print(f"Error loading known faces from database: {e}")
            return False
    
    def base64_to_image(self, base64_string: str) -> np.ndarray:
        try:
            if base64_string.startswith('data:image'):
                base64_string = base64_string.split(',')[1]
            
            image_data = base64.b64decode(base64_string)
            pil_image = Image.open(BytesIO(image_data))
            
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            return np.array(pil_image)
        except Exception as e:
            print(f"Error converting base64 to image: {e}")
            raise ValueError("Invalid image data")
    
    def detect_faces_in_image(self, image: np.ndarray) -> Tuple[list, int]:
        try:
            face_locations = face_recognition.face_locations(image)
            return face_locations, len(face_locations)
        except Exception as e:
            print(f"Error detecting faces: {e}")
            return [], 0
    
    def validate_face(self, base64_image: str) -> Dict:
        try:
            image = self.base64_to_image(base64_image)
            face_locations, face_count = self.detect_faces_in_image(image)
            
            if face_count == 0:
                return {"face_detected": False, "message": "No face detected in the image. Please ensure your face is clearly visible.", "face_count": 0}
            elif face_count > 1:
                return {"face_detected": False, "message": f"Multiple faces detected ({face_count}). Please ensure only one face is in the image.", "face_count": face_count}
            else:
                return {"face_detected": True, "message": "Face detected successfully!", "face_count": 1}
        except Exception as e:
            print(f"Error validating face: {e}")
            return {"face_detected": False, "message": "Error processing image. Please try again.", "face_count": 0}
    
    def register_face(self, db: Session, student_id, name: str, base64_image) -> Dict:
        try:
            validation = self.validate_face(base64_image)
            if not validation["face_detected"]:
                return {"success": False, "message": validation["message"]}
            
            image = self.base64_to_image(base64_image)
            face_locations = face_recognition.face_locations(image)
            if not face_locations:
                return {"success": False, "message": "No face found in image"}
            
            face_encodings = face_recognition.face_encodings(image, face_locations)
            if not face_encodings:
                return {"success": False, "message": "Could not generate face encoding"}
            
            # Process and re-encode the image as JPEG to remove transparency/gray overlay
            from PIL import Image
            import base64
            from io import BytesIO
            if base64_image.startswith('data:image'):
                base64_str = base64_image.split(',')[1]
            else:
                base64_str = base64_image
            try:
                img_bytes = base64.b64decode(base64_str)
                pil_image = Image.open(BytesIO(img_bytes))
                pil_image.load()  # Force loading to catch truncated images
                if pil_image.mode != 'RGB':
                    pil_image = pil_image.convert('RGB')
                buffer = BytesIO()
                pil_image.save(buffer, format='JPEG', quality=95)
                buffer.seek(0)
                jpeg_bytes = buffer.read()
                # Validate JPEG length (arbitrary minimum size, e.g., 2KB)
                if len(jpeg_bytes) < 2048:
                    print(f"Image too small after re-encoding, likely corrupted. Size: {len(jpeg_bytes)} bytes")
                    raise ValueError("Image data is incomplete or corrupted.")
                image_data = base64.b64encode(jpeg_bytes)
            except Exception as e:
                print(f"Error processing image before saving: {e}")
                raise ValueError("Invalid or incomplete image data. Please retake or re-upload the photo.")
            
            existing_face = db.query(KnownFace).filter(KnownFace.student_id == student_id).first()
            if existing_face:
                db.query(KnownFace).filter(KnownFace.student_id == student_id).update({
                    'name': name,
                    'image': image_data,
                    'encoding': pickle.dumps(face_encodings[0])
                })
            else:
                new_face = KnownFace(
                    name=name, 
                    image=image_data, 
                    encoding=pickle.dumps(face_encodings[0]), 
                    student_id=student_id
                )
                db.add(new_face)
            
            db.commit()
            self.load_known_faces_from_db(db)
            return {"success": True, "message": "Face registered successfully"}
            
        except Exception as e:
            print(f"Error registering face: {e}")
            db.rollback()
            return {"success": False, "message": f"Error registering face: {str(e)}"}
    
    def verify_face(self, db: Session, base64_image: str) -> Dict:
        try:
            if not self._initialized or not self.known_encodings:
                self.load_known_faces_from_db(db)
                self._initialized = True
            
            if not self.known_encodings:
                return {"success": False, "confidence": 0.0, "student": None, "timestamp": "", "access_granted": False, "message": "No known faces in database"}
            
            image = self.base64_to_image(base64_image)
            face_locations = face_recognition.face_locations(image)
            if not face_locations:
                return {"success": False, "confidence": 0.0, "student": None, "timestamp": "", "access_granted": False, "message": "No face detected in image"}
            
            face_encodings = face_recognition.face_encodings(image, face_locations)
            if not face_encodings:
                return {"success": False, "confidence": 0.0, "student": None, "timestamp": "", "access_granted": False, "message": "Could not process face"}
            
            for face_encoding in face_encodings:
                matches = face_recognition.compare_faces(self.known_encodings, face_encoding, tolerance=self.tolerance)
                face_distances = face_recognition.face_distance(self.known_encodings, face_encoding)
                
                if True in matches:
                    best_match_index = np.argmin(face_distances)
                    if matches[best_match_index]:
                        confidence = 1 - face_distances[best_match_index]
                        student_id = self.known_student_ids[best_match_index]
                        student = db.query(Student).filter(Student.id == student_id).first()
                        
                        student_dict = None
                        if student:
                            enrollment_date = getattr(student, 'EnrollmentDate', None)
                            student_id_val = getattr(student, 'StudentID', None)
                            student_dict = {
                                "StudentID": str(student_id_val) if student_id_val is not None else None,
                                "FirstName": getattr(student, 'FirstName', None),
                                "LastName": getattr(student, 'LastName', None),
                                "Email": getattr(student, 'Email', None),
                                "Department": getattr(student, 'Department', None),
                                "PhotoPath": getattr(student, 'PhotoPath', None),
                                "EnrollmentDate": enrollment_date.isoformat() if enrollment_date is not None else None,
                                "IsActive": bool(getattr(student, 'IsActive', True)),
                                "CafeAccess": bool(getattr(student, 'CafeAccess', False))
                            }

                        return {
                            "success": True,
                            "student": student_dict,
                            "confidence": float(confidence),
                            "timestamp": "",
                            "access_granted": True
                        }
            
            return {"success": False, "confidence": 0.0, "student": None, "timestamp": "", "access_granted": False, "message": "Face not recognized"}
            
        except Exception as e:
            print(f"Error verifying face: {e}")
            return {"success": False, "confidence": 0.0, "student": None, "timestamp": "", "access_granted": False, "message": f"Error processing image: {str(e)}"}
    
    def detect_faces(self, db: Session, base64_image: str) -> Dict:
        """Detect and identify faces in image"""
        try:
            if not self.known_encodings:
                self.load_known_faces_from_db(db)
            image = self.base64_to_image(base64_image)
            face_locations = face_recognition.face_locations(image)
            face_encodings = face_recognition.face_encodings(image, face_locations)
            
            faces = []
            
            for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
                matches = face_recognition.compare_faces(self.known_encodings, face_encoding, tolerance=self.tolerance)
                face_distances = face_recognition.face_distance(self.known_encodings, face_encoding)
                
                identified = False
                confidence = 0.0
                student_id = None
                name = "Unknown"
                color = "red"
                
                if True in matches and len(face_distances) > 0:
                    best_match_index = np.argmin(face_distances)
                    if matches[best_match_index]:
                        confidence = 1 - face_distances[best_match_index]
                        identified = True
                        student_id = self.known_student_ids[best_match_index]
                        name = self.known_names[best_match_index]
                        color = "green"
                
                faces.append({
                    "box": {
                        "x": left,
                        "y": top,
                        "width": right - left,
                        "height": bottom - top
                    },
                    "identified": identified,
                    "confidence": float(confidence),
                    "student_id": student_id,
                    "name": name,
                    "color": color
                })
            
            return {
                "faces": faces,
                "timestamp": ""
            }
            
        except Exception as e:
            print(f"Error detecting faces: {e}")
            return {
                "faces": [],
                "timestamp": "",
                "error": str(e)
            }
face_service = FaceRecognitionService()