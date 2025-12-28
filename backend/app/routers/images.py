from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models
from ..utils.auth import get_current_user
from ..models.schemas import User
import base64
import io
from PIL import Image
import hashlib
import time
from typing import Optional, Tuple

router = APIRouter(prefix="/api/images", tags=["images"])

def optimize_image(
    image_data: str,
    max_size: Optional[Tuple[int, int]] = (200, 200),
    quality: int = 85,
    format: str = 'JPEG'
) -> bytes:
    """Optimize image by resizing and compressing with WebP support"""
    try:
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        with Image.open(io.BytesIO(image_bytes)) as img:
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')

            if max_size:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            output = io.BytesIO()
            if format.upper() == 'WEBP':
                img.save(output, format='WebP', quality=quality, optimize=True, method=6)
            else:
                img.save(output, format='JPEG', quality=quality, optimize=True)
            return output.getvalue()
    except Exception as e:
        print(f"Image optimization error: {e}")
        # Instead of returning raw bytes, raise an error so the route can handle it
        raise ValueError("Invalid or corrupted image data")

@router.get("/student/{student_id:path}")
async def get_student_image(
    student_id: str,
    request: Request,
    size: str = "medium",  
    format: str = "jpeg",
    no_cache: str = "false",
    db: Session = Depends(get_db)
):
    """Get optimized student profile image with WebP support"""
    no_cache_bool = no_cache.lower() in ('true', '1', 'yes')
    student = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
    
    if not student or student.PhotoPath is None or not student.PhotoPath.strip():
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        size_configs = {
            "thumbnail": {"max_size": (96, 96), "quality": 75},
            "medium": {"max_size": (320, 320), "quality": 85},
            "full": {"max_size": None, "quality": 95},
        }

        config = size_configs.get(size, size_configs["medium"])
        max_size = config["max_size"]
        quality = config["quality"]
        image_format = 'WEBP' if format.lower() == 'webp' else 'JPEG'
        media_type = 'image/webp' if format.lower() == 'webp' else 'image/jpeg'
        optimized_image = optimize_image(str(student.PhotoPath), max_size, quality, image_format)
        # Include timestamp or hash of full PhotoPath to ensure cache busting on updates
        photo_hash = hashlib.md5(str(student.PhotoPath).encode()).hexdigest()
        etag = hashlib.md5(f"{student_id}_{size}_{format}_{photo_hash}".encode()).hexdigest()
        if not no_cache_bool:
            if_none_match = request.headers.get('if-none-match')
            if if_none_match and if_none_match.strip('"') == etag:
                return Response(status_code=304)  
        return Response(
            content=optimized_image,
            media_type=media_type,
            headers={
                "Cache-Control": "public, max-age=86400, immutable" if not no_cache_bool else "no-cache",  
                "ETag": f'"{etag}"',
                "Vary": "Accept",
                "Last-Modified": time.strftime('%a, %d %b %Y %H:%M:%S GMT', time.gmtime())
            }
        )
    except Exception as e:
        print(f"Error serving image: {e}")
        # Return a 404 if the image is invalid or corrupted
        raise HTTPException(status_code=404, detail="Invalid or corrupted image data")

@router.get("/student/{student_id:path}/thumbnail")
async def get_student_thumbnail(student_id: str, request: Request, db: Session = Depends(get_db)):
    """Get small thumbnail for lists and tables"""
    return await get_student_image(student_id, request, "thumbnail", "jpeg", "false", db)

@router.get("/student/{student_id:path}/base64")
async def get_student_image_base64(student_id: str, db: Session = Depends(get_db)):
    """Get student image as base64 data URL"""
    student = db.query(models.Student).filter(models.Student.StudentID == student_id).first()
    if not student or not student.PhotoPath:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(
        content=student.PhotoPath,
        media_type="text/plain",
        headers={"Access-Control-Allow-Origin": "*"}
    )