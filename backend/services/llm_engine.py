import os
import time
import random
import requests
from google import genai
from google.genai import types
from typing import List
from dotenv import load_dotenv

load_dotenv()

# ── Constants ──────────────────────────────────────────────────────────
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GEMINI_MODEL   = "gemini-2.5-flash"

# Multiple free models as fallbacks — if one is rate limited, tries the next
FREE_MODELS = [
    "qwen/qwen-2.5-coder-32b-instruct:free",
    "meta-llama/llama-3.3-70b-instruct:free",
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
    }

    payload = {
        "model": current_model,
        "messages": [
            {"role": "system", "content": "You are DevGuardian, an expert AI debugging and code assistant. Be concise and helpful."},
            {"role": "user", "content": prompt[:6000]},
        ],
        "max_tokens": 800,
        "temperature": 0.3,
    }

    for attempt in range(retries):
        try:
            resp = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=45)

            if resp.status_code == 429:
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


def call_llm_with_history(system_prompt: str, history: list, user_message: str, model_index: int = 0) -> str:
    """
    Sends a multi-turn conversation to OpenRouter with prior chat history.
    history: list of {"role": "user"|"assistant", "content": "..."} dicts
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set in .env file")

    current_model = FREE_MODELS[model_index % len(FREE_MODELS)]
    print(f"[LLM] Multi-turn using model: {current_model}")

    # Build messages: system + history + current message
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-6:]:  # last 6 turns max to keep tokens low
        role = msg.get("role", "user")
        if role == "assistant":
            role = "assistant"
        messages.append({"role": role, "content": str(msg.get("content", ""))[:2000]})
    messages.append({"role": "user", "content": user_message[:4000]})

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": current_model,
        "messages": messages,
        "max_tokens": 1000,
        "temperature": 0.3,
    }
    try:
        resp = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=45)
        if resp.status_code == 429:
            return call_llm_with_history(system_prompt, history, user_message, model_index + 1)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"AI response unavailable: {str(e)}"


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


# ── Gemini helpers ─────────────────────────────────────────────────────

def _get_gemini_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in .env file")
    return genai.Client(api_key=api_key)


def call_gemini(prompt: str) -> str:
    """
    Sends a single prompt to Google Gemini (new google-genai SDK).
    """
    client = _get_gemini_client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )
    return response.text


def call_gemini_with_history(system_prompt: str, history: list, user_message: str) -> str:
    """
    Sends a multi-turn conversation to Gemini so it remembers prior context.
    history: list of {"role": "user"|"assistant", "content": "..."} dicts
    """
    client = _get_gemini_client()

    # Build Gemini history format
    gemini_history = []
    for msg in history:
        role = "user" if msg.get("role") == "user" else "model"
        gemini_history.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg.get("content", ""))],
            )
        )

    chat = client.chats.create(
        model=GEMINI_MODEL,
        config=types.GenerateContentConfig(system_instruction=system_prompt),
        history=gemini_history,
    )
    response = chat.send_message(user_message)
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

def answer_query(question: str, relevant_chunks: List[dict], history: list = None) -> str:
    """Answers a natural language codebase question using OpenRouter (saves Gemini quota)."""
    context = build_context(relevant_chunks)

    system_prompt = (
        "You are DevGuardian, an expert AI code assistant. "
        "You help developers understand their codebase by referencing specific files and functions. "
        "Always use markdown in your responses. Be concise and accurate."
    )

    user_message = (
        f"Question: {question}\n\n"
        f"Relevant Code from Repository:\n{context}\n\n"
        f"Answer clearly, referencing specific files and functions."
    )

    if history:
        return call_gemini_with_history(system_prompt, history, user_message)
    else:
        prompt = f"{system_prompt}\n\n{user_message}"
        return call_gemini(prompt)
