from typing import List, Union
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "mysql+mysqlconnector://root:@localhost:3306/FacialRecognitionDB"
    secret_key: str = "your-secret-key-here-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    upload_dir: str = "uploads"
    faces_dir: str = "uploads/faces"
    photos_dir: str = "uploads/photos"
    # Accept either a single string or a list of origins from env
    cors_allow_origins: Union[List[str], str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"

settings = Settings()