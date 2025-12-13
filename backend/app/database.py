from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def test_database_connection():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        print("✅ XAMPP MYSQL CONNECTED SUCCESSFULLY")
        return True
    except Exception as e:
        print(f"❌ XAMPP MYSQL CONNECTION FAILED: {str(e)}")
        return False

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()