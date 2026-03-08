from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class Repository(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    repo_url: str
    status: str = Field(default="idle")  # idle, cloning, parsing, embedding, ready, error
    message: str = Field(default="")
    total_files: int = Field(default=0)
    total_chunks: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)