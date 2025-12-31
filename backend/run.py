import uvicorn
from dotenv import load_dotenv
import os

# Load .env from backend directory
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=True, 
        reload_dirs=["D:\\MY WORKS\\Student Recognition System\\backend"],
        log_level="info"
    )