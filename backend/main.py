from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import repo, debug

# Load environment variables from .env file
load_dotenv()

# ── Create the FastAPI app ─────────────────────────────────────────────
app = FastAPI(
    title="DevGuardian API",
    description="AI-powered codebase understanding and error diagnosis",
    version="1.0.0",
)

# ── CORS Middleware ────────────────────────────────────────────────────
# Allows the React frontend (running on a different port) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # In production, replace * with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ───────────────────────────────────────────────────
app.include_router(repo.router,  prefix="/api/repo",  tags=["Repository"])
app.include_router(debug.router, prefix="/api/debug", tags=["Debug"])

# ── Health Check ───────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "DevGuardian API is running 🚀"}
