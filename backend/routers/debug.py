from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from services.error_parser import parse_stack_trace
from services.vector_store import search
from services.llm_engine import explain_error, answer_query
from database import engine
from models.repository import Repository
from models.user import User
from routers.auth import get_current_user

router = APIRouter()

# ── Request models ─────────────────────────────────────────────────────

class ErrorRequest(BaseModel):
    error_text: str   # Raw stack trace or error message pasted by developer

class QueryRequest(BaseModel):
    query: str        # Natural language question about the codebase


# ── Helper: format relevant chunks for response ────────────────────────

def format_chunks(chunks: list) -> list:
    """
    Cleans up the chunk data before sending it to the frontend.
    Only sends what the frontend actually needs.
    """
    return [
        {
            "path":       chunk.get("path", "unknown"),
            "start_line": chunk.get("start_line", 0),
            "end_line":   chunk.get("end_line", 0),
            "content":    chunk.get("content", ""),
            "score":      round(chunk.get("score", 0.0), 4),
        }
        for chunk in chunks
    ]


# ── Route 1: POST /api/debug/analyze ──────────────────────────────────

@router.post("/analyze")
def analyze_error(request: ErrorRequest, current_user: User = Depends(get_current_user)):
    """
    Accepts a raw error message or stack trace.

    Flow:
      1. Checks if a repository has been indexed for the user
      2. Parses the error using error_parser → extracts type, files, functions
      3. Builds a smart search query from the parsed info
      4. Searches Qdrant for the top 5 most relevant code chunks
      5. Returns parsed error info + relevant code chunks + AI explanation
    """
    with Session(engine) as session:
        # Check if user has a repository
        statement = select(Repository).where(Repository.user_id == current_user.id)
        repo = session.exec(statement).first()
        if not repo or repo.status != "ready":
            raise HTTPException(
                status_code=400,
                detail="No repository indexed yet. Please ingest a repository first."
            )

    try:
        # Step 2 — Parse the raw error text
        error_info = parse_stack_trace(request.error_text)

        # Step 3 — Search Qdrant with the smart query built by error_parser
        relevant_chunks = search(error_info["search_query"], current_user.id, repo.id, top_k=5)

        # Step 4 — Return everything
        return {
            "error_info": {
                "error_type":          error_info.get("error_type"),
                "error_message":       error_info.get("error_message"),
                "files_mentioned":     error_info.get("files_mentioned", []),
                "functions_mentioned": error_info.get("functions_mentioned", []),
                "line_numbers":        error_info.get("line_numbers", []),
            },
            "relevant_files": format_chunks(relevant_chunks),
            "explanation": explain_error(error_info, relevant_chunks),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Route 2: POST /api/debug/query ────────────────────────────────────

@router.post("/query")
def query_codebase(request: QueryRequest, current_user: User = Depends(get_current_user)):
    """
    Accepts a natural language question about the codebase.

    Flow:
      1. Checks if a repository has been indexed for the user
      2. Searches Qdrant for the top 5 most relevant code chunks
      3. Returns matched code chunks + AI answer
    """
    with Session(engine) as session:
        # Check if user has a repository
        statement = select(Repository).where(Repository.user_id == current_user.id)
        repo = session.exec(statement).first()
        if not repo or repo.status != "ready":
            raise HTTPException(
                status_code=400,
                detail="No repository indexed yet. Please ingest a repository first."
            )

    try:
        # Step 2 — Search Qdrant directly with the natural language query
        relevant_chunks = search(request.query, current_user.id, repo.id, top_k=5)

        # Step 3 — Return results
        return {
            "query":          request.query,
            "relevant_files": format_chunks(relevant_chunks),
            "answer": answer_query(request.query, relevant_chunks),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
