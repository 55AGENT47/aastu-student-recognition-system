# Student Recognition System

A facial recognition-based access control system for educational institutions, featuring main gate and cafeteria access management with meal scheduling capabilities.

## Features

- **Facial Recognition**: Real-time student identification using face recognition
- **Multi-Point Access Control**: Main gate and cafeteria entry management
- **Meal Schedule Management**: Configure breakfast, lunch, and dinner periods
- **Duplicate Entry Prevention**: Prevents multiple cafeteria entries per meal period
- **Live Verification**: Webcam and IP camera support
- **Role-Based Access**: Admin, Main Gate Security, and Cafeteria Security portals
- **Comprehensive Logging**: Track all access attempts with timestamps and confidence scores
- **Student Management**: Add, edit, and manage student profiles with photos

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Axios
- Lucide React Icons

### Backend
- FastAPI
- Python 3.8+
- MySQL
- SQLAlchemy
- Face Recognition (dlib)
- OpenCV
- JWT Authentication

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- MySQL 8.0 or higher
- Webcam or IP camera (for live verification)

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd "Student Recognition System"
```

### 2. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE student_recognition;
exit;

# Import schema
mysql -u root -p student_recognition < database/schema.sql
```

### 3. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=student_recognition
# SECRET_KEY=your-secret-key-here
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
copy .env .env.local

# Edit .env.local
# VITE_API_BASE_URL=http://localhost:8000
```

## Running the Application

### Start Backend Server
```bash
cd backend
python run.py
```
Backend will run on `http://localhost:8000`

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:5173`

## Default Credentials

### Administrator
- Email: `admin@aastu.edu.et`
- Password: `admin123`

### Cafeteria Security
- Email: `cafeteria@aastu.edu.et`
- Password: `cafe123`

### Main Gate Security
- Email: `security@aastu.edu.et`
- Password: `sec123`

## Usage

### Initial Setup
1. Access `http://localhost:5173`
2. Login with admin credentials
3. Navigate to Students section
4. Add students with photos
5. Configure meal schedules (Admin only)
6. Configure cameras

### Adding Students
1. Login as Administrator
2. Go to "Students" tab
3. Click "Add New Student"
4. Fill in student details
5. Upload student photo (face should be clearly visible)
6. System will automatically extract and register face

### Live Verification
1. Login as Security personnel
2. Go to "Live Verification" tab
3. Start webcam or configure IP camera
4. System automatically detects and verifies faces every 3 seconds
5. Access granted/denied based on recognition confidence

### Cafeteria Access Control
1. Configure meal schedules (Admin)
2. Enable cafeteria access for students (Admin)
3. Security personnel verify students at cafeteria entrance
4. System prevents duplicate entries per meal period
5. View logs in "Cafeteria Logs" tab

## API Documentation

Access interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
Student Recognition System/
├── backend/
│   ├── app/
│   │   ├── models/          # Database models
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   ├── config.py        # Configuration
│   │   ├── database.py      # Database connection
│   │   └── main.py          # FastAPI app
│   ├── uploads/             # Student photos
│   ├── requirements.txt     # Python dependencies
│   └── run.py              # Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # React context
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Main app component
│   ├── package.json         # Node dependencies
│   └── vite.config.ts       # Vite configuration
└── database/
    └── schema.sql           # Database schema
```

## Key Features Explained

### Face Recognition
- Uses dlib's face recognition model
- 128-dimensional face encoding
- Confidence threshold: 59%
- Supports multiple faces in frame

### Meal Schedule System
- Three meal periods: Breakfast, Lunch, Dinner
- Configurable time ranges
- Automatic period detection
- Duplicate entry prevention per period

### Access Control
- Real-time face detection and recognition
- Confidence-based access decisions
- Comprehensive logging
- Role-based permissions

## Troubleshooting

### Camera Not Working
- Check browser permissions
- Ensure camera is not in use by another application
- Try different browser (Chrome recommended)

### Face Not Detected
- Ensure good lighting
- Face should be clearly visible
- Remove glasses/masks if possible
- Move closer to camera

### Low Recognition Confidence
- Re-register student with better quality photo
- Ensure consistent lighting conditions
- Use high-resolution camera

### Database Connection Error
- Verify MySQL is running
- Check .env credentials
- Ensure database exists

## Building for Production

### Frontend
```bash
cd frontend
npm run build
```
Build output in `frontend/dist/`

### Backend
```bash
# Use production ASGI server
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Security Considerations

- Change default passwords immediately
- Use strong SECRET_KEY in production
- Enable HTTPS in production
- Regularly backup database
- Implement rate limiting
- Store face encodings securely

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please create an issue in the repository.

## Contributors

- Usman Aman
- Khalid Ibrahim
- Yohannes wondimu

## Acknowledgments

- Face Recognition library by Adam Geitgey
- FastAPI framework
- React and Vite teams
