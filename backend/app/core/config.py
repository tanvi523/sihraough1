import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "AI-Powered Railway Maintenance Block Optimizer"
    API_V1_STR: str = "/api"
    # Default to absolute path SQLite DB if DATABASE_URL not set in env
    DEFAULT_SQLITE_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../railway_optimizer.db")).replace("\\", "/")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")
    DATASET_DIR: str = os.getenv("DATASET_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "../../datasets")))
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
