"""
Application Configuration
"""
from pydantic_settings import BaseSettings


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
