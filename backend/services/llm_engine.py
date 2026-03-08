import os
import time
import random
import requests
import google.generativeai as genai
from typing import List
from dotenv import load_dotenv

load_dotenv()

# ── Constants ──────────────────────────────────────────────────────────
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Multiple free models as fallbacks — if one is rate limited, tries the next
FREE_MODELS = [
    "qwen/qwen3-coder:free",
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
]


# ── Core LLM caller with model rotation + retry ────────────────────────

def call_llm(prompt: str, model_index: int = 0, retries: int = 3) -> str:
    """
    Sends a prompt to OpenRouter with automatic model rotation.
    If a model is rate-limited (429), waits and tries the next model.
    Falls back through FREE_MODELS list automatically.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set in .env file")

    current_model = FREE_MODELS[model_index % len(FREE_MODELS)]
    print(f"[LLM] Using model: {current_model}")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "DevGuardian",
    }

    payload = {
        "model": current_model,
        "messages": [
            {"role": "system", "content": "You are DevGuardian, an expert AI debugging and code assistant. Be concise and helpful."},
            {"role": "user", "content": prompt[:6000]},  # Cap prompt size
        ],
        "max_tokens": 800,
        "temperature": 0.3,
    }

    for attempt in range(retries):
        try:
            resp = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=45)

            if resp.status_code == 429:
                # Rate limited — wait with exponential backoff then try next model
                wait_time = min(60, (2 ** attempt) * 3 + random.uniform(0, 3))
                print(f"[LLM] Rate limit on {current_model}. Waiting {wait_time:.1f}s then trying next model...")
                time.sleep(wait_time)
                return call_llm(prompt, model_index + 1, retries - 1)

            if resp.status_code == 401:
                raise ValueError("Invalid OpenRouter API key. Please update OPENROUTER_API_KEY in .env")

            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

        except requests.exceptions.RequestException as e:
            if attempt == retries - 1:
                print(f"[LLM] All retries failed: {e}")
                return f"AI explanation unavailable: {str(e)}"
            wait_time = (2 ** attempt) + random.uniform(0, 2)
            print(f"[LLM] Error: {e}. Retrying in {wait_time:.1f}s...")
            time.sleep(wait_time)

    return "AI explanation unavailable after all retries."


# ── Helper: build code context string ─────────────────────────────────

def build_context(chunks: List[dict]) -> str:
    """Formats top 3 code chunks, 30 lines each, to keep tokens low."""
    if not chunks:
        return "No relevant code found in the indexed repository."

    parts = []
    for chunk in chunks[:3]:
        content = chunk.get("content", "")
        trimmed = "\n".join(content.split("\n")[:30])
        parts.append(
            f"File: {chunk.get('path', 'unknown')} "
            f"(Lines {chunk.get('start_line', '?')}-{chunk.get('end_line', '?')})\n"
            f"```\n{trimmed}\n```"
        )
    return "\n\n".join(parts)


# ── Gemini caller ─────────────────────────────────────────────────────

def call_gemini(prompt: str) -> str:
    """
    Sends a prompt to Google Gemini Pro.
    Used for the explanation and query answer steps.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in .env file")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(prompt)
    return response.text


# ── Function 1: Explain an error ───────────────────────────────────────

def explain_error(error_info: dict, relevant_chunks: List[dict]) -> str:
    """Analyzes an error + relevant code using Gemini and returns explanation."""
    context = build_context(relevant_chunks)

    prompt = (
        f"You are DevGuardian, an expert AI debugging assistant.\n\n"
        f"Analyze this error from a developer's codebase and explain it clearly.\n\n"
        f"Error Type: {error_info.get('error_type') or 'Unknown'}\n"
        f"Error Message: {error_info.get('error_message') or error_info.get('raw', 'N/A')}\n"
        f"Files: {', '.join(error_info.get('files_mentioned', [])) or 'None'}\n\n"
        f"Relevant Code from Repository:\n{context}\n\n"
        f"Respond with:\n"
        f"1) **Root Cause** - Why is this happening?\n"
        f"2) **Fix** - Show corrected code\n"
        f"3) **Prevention** - One tip to avoid this\n"
        f"Be concise and use markdown."
    )

    return call_gemini(prompt)


# ── Function 2: Answer a codebase query ────────────────────────────────

def answer_query(question: str, relevant_chunks: List[dict]) -> str:
    """Answers a natural language question about the codebase using Gemini."""
    context = build_context(relevant_chunks)

    prompt = (
        f"You are DevGuardian, an AI code assistant.\n\n"
        f"A developer asked this question about their codebase:\n\n"
        f"Question: {question}\n\n"
        f"Relevant Code from Repository:\n{context}\n\n"
        f"Answer clearly, referencing specific files and functions. Use markdown."
    )

    return call_gemini(prompt)
