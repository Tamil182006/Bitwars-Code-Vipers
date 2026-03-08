from sqlmodel import create_engine, SQLModel
import os
from dotenv import load_dotenv

from models.user import User
from models.repository import Repository

load_dotenv()

password = os.getenv("DBPASSWORD")
dbname = os.getenv("DBNAME")

DATABASE_URL = f"postgresql://postgres:{password}@localhost:5432/{dbname}"

engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)