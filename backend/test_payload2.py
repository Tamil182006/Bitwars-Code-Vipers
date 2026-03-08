import sys
import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")

payload = {
    "model": "google/gemma-3-27b-it:free",
    "messages": [
        {"role": "system", "content": "You are DevGuardian."},
        {"role": "user", "content": "hi"}
    ],
    "max_tokens": 800,
    "temperature": 0.3
}
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:5173",
    "X-OpenRouter-Title": "DevGuardian",
}

resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
print(resp.status_code)
print(resp.text)
