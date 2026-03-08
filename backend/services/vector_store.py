import os
import uuid
from typing import List
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer

load_dotenv()

# ── Constants ──────────────────────────────────────────────────────────
COLLECTION_NAME = "devguardian_code"
EMBEDDING_MODEL  = "all-MiniLM-L6-v2"   # produces 384-dim vectors
VECTOR_SIZE      = 384

# ── Lazy-loaded singletons ─────────────────────────────────────────────
_model  = None
_client = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        url = os.getenv("QDRANT_URL")
        api_key = os.getenv("QDRANT_API_KEY")
        if url and api_key:
            try:
                # Try connecting to Qdrant Cloud
                _client = QdrantClient(url=url, api_key=api_key, timeout=5)
                # Test the connection
                _client.get_collections()
                print("[VectorStore] Connected to Qdrant Cloud ✅")
            except Exception as e:
                # Cloud not reachable — fall back to local in-memory mode
                print(f"[VectorStore] Cloud connection failed ({e}). Using in-memory mode.")
                _client = QdrantClient(":memory:")
        else:
            # No cloud credentials — use in-memory mode
            print("[VectorStore] No cloud credentials found. Using in-memory mode.")
            _client = QdrantClient(":memory:")
    return _client


# ── Build Index ────────────────────────────────────────────────────────

def build_index(chunks: List[dict], user_id: int, repo_id: int) -> None:
    """
    Takes the list of code chunks from code_parser.py,
    generates an embedding for each chunk,
    and uploads them all to the Qdrant Cloud collection.

    Steps:
      1. Connect to Qdrant Cloud
      2. Create collection if it doesn't exist
      3. Generate embeddings for all chunks
      4. Upload everything to Qdrant with user_id and repo_id in payload
    """
    client = get_client()
    model  = get_model()

    # Step 1 — Create collection if it doesn't exist
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )

    # Step 2 — Generate embeddings for all chunks
    texts = [f"File: {c['path']}\n{c['content']}" for c in chunks]
    print(f"[VectorStore] Generating embeddings for {len(texts)} chunks...")
    embeddings = model.encode(texts, batch_size=64, show_progress_bar=True)

    # Step 3 — Build Qdrant points and upload in batches
    points = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        points.append(
            PointStruct(
                id=str(uuid.uuid4()),  # Use UUID to avoid conflicts
                vector=embedding.tolist(),
                payload={
                    "chunk_id":   chunk.get("chunk_id", str(i)),
                    "path":       chunk["path"],
                    "content":    chunk["content"],
                    "start_line": chunk.get("start_line", 0),
                    "end_line":   chunk.get("end_line", 0),
                    "user_id":    user_id,
                    "repo_id":    repo_id,
                }
            )
        )

    # Upload in batches of 100 to avoid timeout
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        client.upsert(collection_name=COLLECTION_NAME, points=batch)

    print(f"[VectorStore] Uploaded {len(points)} vectors to Qdrant ✅")

    # Upload in batches of 100 to avoid timeout
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        client.upsert(collection_name=COLLECTION_NAME, points=batch)

    print(f"[VectorStore] Uploaded {len(points)} vectors to Qdrant ✅")


# ── Search ─────────────────────────────────────────────────────────────

def search(query: str, user_id: int, repo_id: int, top_k: int = 5) -> List[dict]:
    """
    Converts the search query into an embedding and
    finds the top_k most similar code chunks in Qdrant for the specific user and repo.

    Returns a list of chunk dicts with path, content, line numbers.
    """
    client = get_client()
    model  = get_model()

    query_embedding = model.encode([query])[0].tolist()

    # Filter by user_id and repo_id
    filter_conditions = {
        "must": [
            {"key": "user_id", "match": {"value": user_id}},
            {"key": "repo_id", "match": {"value": repo_id}}
        ]
    }

    # query_points() is the new API in qdrant-client >= 1.7
    response = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=top_k,
        filter=filter_conditions,
        with_payload=True,
    )

    chunks = []
    for hit in response.points:
        payload = hit.payload or {}
        chunks.append({
            "path":       payload.get("path", "unknown"),
            "content":    payload.get("content", ""),
            "start_line": payload.get("start_line", 0),
            "end_line":   payload.get("end_line", 0),
            "score":      hit.score,
        })

    return chunks


# ── Health Check ───────────────────────────────────────────────────────

def index_exists() -> bool:
    """
    Returns True if the Qdrant collection exists and has at least 1 vector.
    Checks directly — no in-memory flags that can get reset.
    """
    try:
        client = get_client()
        existing = [c.name for c in client.get_collections().collections]
        if COLLECTION_NAME not in existing:
            return False
        # Directly count points — works for both cloud and in-memory Qdrant
        count_result = client.count(collection_name=COLLECTION_NAME)
        return count_result.count > 0
    except Exception:
        return False
