from typing import List, Union
from pydantic_settings import BaseSettings
import os
from pathlib import Path

# Get the backend directory path
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    database_url: str = "mysql+mysqlconnector://root:@localhost:3306/FacialRecognitionDB"
    secret_key: str = "your-secret-key-here-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    upload_dir: str = "uploads"
    faces_dir: str = "uploads/faces"
    photos_dir: str = "uploads/photos"
    smtp_email: str = "usmanamanayubmybrother@gmail.com"
    smtp_password: str = "srmlptwmksekfhmg"
    cors_allow_origins: Union[List[str], str] = ["http://localhost:3000"]
    
    class Config:
        env_file = str(ENV_FILE)
        env_file_encoding = 'utf-8'
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.smtp_password:
            self.smtp_password = self.smtp_password.replace(' ', '')

settings = Settings()