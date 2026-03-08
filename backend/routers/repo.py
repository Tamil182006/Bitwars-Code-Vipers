import os
import tempfile
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from services.code_parser import clone_repo, extract_code_files, chunk_code
from services.vector_store import build_index

router = APIRouter()

# ── Request model ──────────────────────────────────────────────────────
class RepoRequest(BaseModel):
    repo_url: str   # e.g. "https://github.com/user/project"

# ── In-memory status tracker ───────────────────────────────────────────
# Keeps track of what stage the ingestion pipeline is currently at.
# The frontend polls GET /status to read this.
ingestion_status = {
    "status": "idle",       # idle | cloning | parsing | embedding | ready | error
    "message": "",
    "total_files": 0,
    "total_chunks": 0,
}


# ── Background Task — the actual ingestion pipeline ────────────────────

def run_ingestion(repo_url: str) -> None:
    """
    This function runs in the background after the frontend hits /ingest.
    It goes through all 3 stages:
      Stage 1 — Clone the repo
      Stage 2 — Extract files and chunk them
      Stage 3 — Generate embeddings and upload to Qdrant
    Updates ingestion_status at each stage so the frontend can track progress.
    """
    global ingestion_status

    try:
        # ── Stage 1: Clone ────────────────────────────────────────────
        ingestion_status = {
            "status": "cloning",
            "message": f"Cloning repository: {repo_url}",
            "total_files": 0,
            "total_chunks": 0,
        }

        target_dir = os.path.join(tempfile.gettempdir(), "devguardian_repo")
        clone_repo(repo_url, target_dir)

        # ── Stage 2: Parse files into chunks ──────────────────────────
        ingestion_status["status"] = "parsing"
        ingestion_status["message"] = "Extracting and chunking code files..."

        code_files = extract_code_files(target_dir)

        all_chunks = []
        for file_data in code_files:
            chunks = chunk_code(file_data)
            all_chunks.extend(chunks)

        ingestion_status["total_files"] = len(code_files)
        ingestion_status["total_chunks"] = len(all_chunks)

        # ── Stage 3: Embed and upload to Qdrant ───────────────────────
        ingestion_status["status"] = "embedding"
        ingestion_status["message"] = (
            f"Generating embeddings for {len(all_chunks)} chunks "
            f"from {len(code_files)} files. This may take a moment..."
        )

        build_index(all_chunks)

        # ── Done ──────────────────────────────────────────────────────
        ingestion_status = {
            "status": "ready",
            "message": (
                f"Repository indexed successfully! "
                f"{len(code_files)} files and {len(all_chunks)} chunks are ready."
            ),
            "total_files": len(code_files),
            "total_chunks": len(all_chunks),
        }

    except Exception as e:
        # If anything fails, update status to error so frontend can show it
        ingestion_status = {
            "status": "error",
            "message": f"Ingestion failed: {str(e)}",
            "total_files": 0,
            "total_chunks": 0,
        }


# ── Route 1: POST /api/repo/ingest ────────────────────────────────────

@router.post("/ingest")
def ingest_repo(request: RepoRequest, background_tasks: BackgroundTasks):
    """
    Accepts a GitHub repo URL and starts the ingestion pipeline
    in the background. Returns immediately without waiting for it to finish.
    """
    # Prevent starting a new ingestion while one is already running
    if ingestion_status["status"] in ["cloning", "parsing", "embedding"]:
        raise HTTPException(
            status_code=400,
            detail="An ingestion is already in progress. Please wait for it to finish."
        )

    # Kick off the pipeline in the background
    background_tasks.add_task(run_ingestion, request.repo_url)

    return {
        "message": "Repository ingestion started.",
        "status": "started"
    }


# ── Route 2: GET /api/repo/status ─────────────────────────────────────

@router.get("/status")
def get_ingestion_status():
    """
    Returns the current status of the ingestion pipeline.
    Frontend calls this every few seconds to check if it's done.
    """
    return ingestion_status
