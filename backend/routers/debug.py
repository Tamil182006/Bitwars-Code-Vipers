from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List, Optional

from services.error_parser import parse_stack_trace, extract_variable_names
from services.vector_store import search
from services.llm_engine import explain_error, answer_query, call_llm
from database import engine
from models.repository import Repository
from models.user import User
from routers.auth import get_current_user

router = APIRouter()

# ── Request models ─────────────────────────────────────────────────────

class HistoryMessage(BaseModel):
    role: str     # "user" or "assistant"
    content: str  # plain text of the message

class ErrorRequest(BaseModel):
    error_text: str
    history: Optional[List[HistoryMessage]] = []

class QueryRequest(BaseModel):
    query: str
    history: Optional[List[HistoryMessage]] = []   # last N chat turns for memory


# ── Helper: format relevant chunks for response ────────────────────────

def format_chunks(chunks: list) -> list:
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

def get_user_repo(session, user_id: int) -> Repository:
    """Helper to get a ready repository for the current user."""
    statement = select(Repository).where(Repository.user_id == user_id)
    repo = session.exec(statement).first()
    if not repo or repo.status != "ready":
        raise HTTPException(
            status_code=400,
            detail="No repository indexed yet. Please ingest a repository first."
        )
    return repo


# ── Route 1: POST /api/debug/analyze ──────────────────────────────────

@router.post("/analyze")
def analyze_error(request: ErrorRequest, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        repo = get_user_repo(session, current_user.id)

    try:
        # ── Step 1: Parse the raw error text ──────────────────────────────
        error_info = parse_stack_trace(request.error_text)

        # ── Step 2: Primary vector search — the crash site ────────────────
        primary_chunks = search(error_info["search_query"], current_user.id, repo.id, top_k=4)

        # ── Step 3: Trace RAG — follow the variable ───────────────────────
        # Extract variable names from the error (e.g. 'user', 'session_token')
        # then search for where those variables are DEFINED or INITIALIZED
        # so Gemini sees both the crash site AND the data source.
        variable_names = extract_variable_names(error_info)
        trace_chunks = []
        if variable_names:
            # Build a definition-search query: "def user", "user =", "user:"
            var_query = " ".join([
                f"{v} definition initialization assignment"
                for v in variable_names[:2]  # limit to top 2 variables
            ])
            trace_chunks = search(var_query, current_user.id, repo.id, top_k=3)

        # ── Step 4: Merge & deduplicate results ────────────────────────────
        # Primary chunks come first (crash site); trace chunks are appended
        # only if they are not already present (matched by path + start_line)
        seen_keys = {(c.get("path"), c.get("start_line")) for c in primary_chunks}
        for chunk in trace_chunks:
            key = (chunk.get("path"), chunk.get("start_line"))
            if key not in seen_keys:
                primary_chunks.append(chunk)
                seen_keys.add(key)

        relevant_chunks = primary_chunks  # now contains crash site + variable origins

        # ── Step 5: Return everything ──────────────────────────────────────
        return {
            "error_info": {
                "error_type":          error_info.get("error_type"),
                "error_message":       error_info.get("error_message"),
                "files_mentioned":     error_info.get("files_mentioned", []),
                "functions_mentioned": error_info.get("functions_mentioned", []),
                "line_numbers":        error_info.get("line_numbers", []),
                "variables_traced":    variable_names,   # surfaced for transparency
            },
            "relevant_files": format_chunks(relevant_chunks),
            "explanation": explain_error(error_info, relevant_chunks),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Route 2: POST /api/debug/query ────────────────────────────────────

@router.post("/query")
def query_codebase(request: QueryRequest, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        repo = get_user_repo(session, current_user.id)

    try:
        relevant_chunks = search(request.query, current_user.id, repo.id, top_k=5)

        # Convert history to plain dicts for the LLM engine
        history_dicts = [{"role": m.role, "content": m.content} for m in (request.history or [])]

        return {
            "query":          request.query,
            "relevant_files": format_chunks(relevant_chunks),
            "answer": answer_query(request.query, relevant_chunks, history=history_dicts),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Route 3: POST /api/debug/scan ─────────────────────────────────────

SECURITY_PATTERNS = [
    "hardcoded password secret api key token",
    "SQL injection raw query string format",
    "eval exec os.system subprocess shell=True",
    "insecure random md5 sha1 weak hash",
    "open redirect unvalidated user input URL",
]

@router.post("/scan")
def security_scan(current_user: User = Depends(get_current_user)):
    """
    Automatically scans the indexed codebase for common security vulnerabilities.
    Runs 5 semantic searches for different vulnerability patterns,
    then asks Gemini to analyze and rank the findings.
    """
    with Session(engine) as session:
        repo = get_user_repo(session, current_user.id)

    try:
        # Run multiple vector searches for different vulnerability categories
        all_findings = {}
        for pattern in SECURITY_PATTERNS:
            hits = search(pattern, current_user.id, repo.id, top_k=2)
            for chunk in hits:
                key = chunk.get("path", "unknown")
                if key not in all_findings:
                    all_findings[key] = chunk

        # Build context from unique suspicious chunks
        unique_chunks = list(all_findings.values())[:8]
        if not unique_chunks:
            return {
                "scan_result": "✅ No obvious security vulnerabilities detected in the indexed codebase.",
                "findings_count": 0,
                "files_scanned": [],
            }

        context_parts = []
        for chunk in unique_chunks:
            content = "\n".join(chunk.get("content", "").split("\n")[:25])
            context_parts.append(
                f"File: {chunk.get('path')} (Lines {chunk.get('start_line')}-{chunk.get('end_line')})\n"
                f"```\n{content}\n```"
            )
        context = "\n\n".join(context_parts)

        prompt = (
            "You are DevGuardian, an expert security code auditor.\n\n"
            "Analyze these code snippets from a developer's repository for security vulnerabilities.\n\n"
            f"{context}\n\n"
            "Provide a security audit report with:\n"
            "1. **🔴 Critical Issues** - Immediate threats (hardcoded secrets, SQLi, RCE)\n"
            "2. **🟡 Warnings** - Potential vulnerabilities that need review\n"
            "3. **🟢 Good Practices Found** - Security measures already in place\n"
            "4. **📋 Recommendations** - Top 3 actions to improve security\n\n"
            "Be specific about file names and line numbers. Use markdown."
        )

        report = call_llm(prompt)

        return {
            "scan_result": report,
            "findings_count": len(unique_chunks),
            "files_scanned": [c.get("path") for c in unique_chunks],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
