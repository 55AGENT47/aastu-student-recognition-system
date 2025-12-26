import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models import models
from ..config import settings

class EmailService:
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.email = settings.smtp_email
        self.password = settings.smtp_password

    def generate_otp(self) -> str:
        return str(random.randint(100000, 999999))

    def send_otp_email(self, to_email: str, otp_code: str, name: str) -> bool:
        try:
            msg = MIMEMultipart()
            msg['From'] = self.email
            msg['To'] = to_email
            msg['Subject'] = "Password Reset OTP - Student Recognition System"

            body = f"""
            Dear {name},

            Your OTP for password reset is: {otp_code}

            This OTP will expire in 10 minutes.

            If you didn't request this, please ignore this email.

            Best regards,
            Student Recognition System
            """

            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email, self.password)
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            print(f"Email sending failed: {e}")
            return False

    def store_otp(self, db: Session, email: str, otp_code: str):
        # Delete existing OTPs for this email
        db.query(models.PasswordResetOTP).filter(
            models.PasswordResetOTP.email == email
        ).delete()

        # Create new OTP
        otp_record = models.PasswordResetOTP(
            email=email,
            otp_code=otp_code,
            expires_at=datetime.now() + timedelta(minutes=10)
        )
        db.add(otp_record)
        db.commit()

    def verify_otp(self, db: Session, email: str, otp_code: str) -> bool:
        otp_record = db.query(models.PasswordResetOTP).filter(
            models.PasswordResetOTP.email == email,
            models.PasswordResetOTP.otp_code == otp_code,
            models.PasswordResetOTP.is_used == False,
            models.PasswordResetOTP.expires_at > datetime.now()
        ).first()

        if otp_record:
            setattr(otp_record, 'is_used', True)
            db.commit()
            return True
        return False

email_service = EmailService()