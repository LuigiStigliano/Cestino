import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings # Modificato da pydantic import BaseSettings

# Carica variabili da .env che si trova due cartelle sopra (nella root di backend/)
dotenv_path_backend = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path=dotenv_path_backend)

class Settings(BaseSettings):
    PROJECT_NAME: str = "FibraGIS Backend - API Edifici e TFO"

    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "sys")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "aquila_gis")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")

    DATABASE_URL: str = f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    DB_CONFIG_PSYCOPG2: dict = {
        'host': POSTGRES_HOST,
        'database': POSTGRES_DB,
        'user': POSTGRES_USER,
        'password': POSTGRES_PASSWORD,
        'port': POSTGRES_PORT
    }

settings = Settings()