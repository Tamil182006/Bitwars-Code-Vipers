import os
import tempfile
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlmodel import Session, select
from datetime import datetime

from services.code_parser import clone_repo, extract_code_files, chunk_code
from services.vector_store import build_index
from database import engine
from models.repository import Repository
from models.user import User
from routers.auth import get_current_user

router = APIRouter()

# ── Request model ──────────────────────────────────────────────────────
class RepoRequest(BaseModel):
    repo_url: str   # e.g. "https://github.com/user/project"


# ── Background Task — the actual ingestion pipeline ────────────────────

def run_ingestion(repo_id: int) -> None:
    """
    This function runs in the background after the frontend hits /ingest.
    It goes through all 3 stages:
      Stage 1 — Clone the repo
      Stage 2 — Extract files and chunk them
      Stage 3 — Generate embeddings and upload to Qdrant
    Updates the repository status in DB at each stage.
    """
    with Session(engine) as session:
        repo = session.get(Repository, repo_id)
        if not repo:
            return

        try:
            # ── Stage 1: Clone ────────────────────────────────────────────
            repo.status = "cloning"
            repo.message = f"Cloning repository: {repo.repo_url}"
            repo.total_files = 0
            repo.total_chunks = 0
            repo.updated_at = datetime.utcnow()
            session.commit()

            target_dir = os.path.join(tempfile.gettempdir(), f"devguardian_repo_{repo_id}")
            clone_repo(repo.repo_url, target_dir)

            # ── Stage 2: Parse files into chunks ──────────────────────────
            repo.status = "parsing"
            repo.message = "Extracting and chunking code files..."
            repo.updated_at = datetime.utcnow()
            session.commit()

            code_files = extract_code_files(target_dir)

            all_chunks = []
            for file_data in code_files:
                chunks = chunk_code(file_data)
                all_chunks.extend(chunks)

            repo.total_files = len(code_files)
            repo.total_chunks = len(all_chunks)
            repo.updated_at = datetime.utcnow()
            session.commit()

            # ── Stage 3: Embed and upload to Qdrant ───────────────────────
            repo.status = "embedding"
            repo.message = (
                f"Generating embeddings for {len(all_chunks)} chunks "
                f"from {len(code_files)} files. This may take a moment..."
            )
            repo.updated_at = datetime.utcnow()
            session.commit()

            build_index(all_chunks, repo.user_id, repo.id)

            # ── Done ──────────────────────────────────────────────────────
            repo.status = "ready"
            repo.message = (
                f"Repository indexed successfully! "
                f"{len(code_files)} files and {len(all_chunks)} chunks are ready."
            )
            repo.updated_at = datetime.utcnow()
            session.commit()

        except Exception as e:
            # If anything fails, update status to error
            repo.status = "error"
            repo.message = f"Ingestion failed: {str(e)}"
            repo.total_files = 0
            repo.total_chunks = 0
            repo.updated_at = datetime.utcnow()
            session.commit()


# ── Route 1: POST /api/repo/ingest ────────────────────────────────────

@router.post("/ingest")
def ingest_repo(request: RepoRequest, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """
    Accepts a GitHub repo URL and starts the ingestion pipeline
    in the background. Returns immediately without waiting for it to finish.
    """
    with Session(engine) as session:
        # Check if user already has a repository
        statement = select(Repository).where(Repository.user_id == current_user.id)
        existing_repo = session.exec(statement).first()
        if existing_repo and existing_repo.status in ["cloning", "parsing", "embedding"]:
            raise HTTPException(
                status_code=400,
                detail="An ingestion is already in progress. Please wait for it to finish."
            )

        # Create or update repository
        if existing_repo:
            repo = existing_repo
            repo.repo_url = request.repo_url
            repo.status = "idle"
            repo.message = ""
            repo.total_files = 0
            repo.total_chunks = 0
            repo.updated_at = datetime.utcnow()
        else:
            repo = Repository(
                user_id=current_user.id,
                repo_url=request.repo_url,
                status="idle",
                message="",
                total_files=0,
                total_chunks=0
            )
            session.add(repo)
        session.commit()
        session.refresh(repo)

        # Kick off the pipeline in the background
        background_tasks.add_task(run_ingestion, repo.id)

        return {
            "message": "Repository ingestion started.",
            "status": "started",
            "repo_id": repo.id
        }


# ── Route 2: GET /api/repo/status ─────────────────────────────────────

@router.get("/status")
def get_ingestion_status(current_user: User = Depends(get_current_user)):
    """
    Returns the current status of the ingestion pipeline for the current user.
    """
    with Session(engine) as session:
        statement = select(Repository).where(Repository.user_id == current_user.id)
        repo = session.exec(statement).first()
        if not repo:
            return {
                "status": "idle",
                "message": "No repository ingested yet.",
                "total_files": 0,
                "total_chunks": 0,
            }
        return {
            "status": repo.status,
            "message": repo.message,
            "total_files": repo.total_files,
            "total_chunks": repo.total_chunks,
        }
