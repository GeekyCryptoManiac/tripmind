"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional

from app.ssm_loader import load_ssm_parameters
load_ssm_parameters()


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    DATABASE_URL: str
    
    # OpenAI
    OPENAI_API_KEY: str
    
    # Security
    SECRET_KEY: str
    
    # Application
    DEBUG: bool = False
    FRONTEND_URL: str = "http://localhost:5173"

    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_s3_bucket: str = ""
    aws_s3_region: str = "ap-southeast-2"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton instance
settings = Settings()


if __name__ == "__main__":
    print("Configuration loaded successfully!")
    print(f"Database: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    print(f"OpenAI Key: {settings.OPENAI_API_KEY[:20]}...")
    print(f"Debug Mode: {settings.DEBUG}")
    print(f"Frontend URL: {settings.FRONTEND_URL}")
