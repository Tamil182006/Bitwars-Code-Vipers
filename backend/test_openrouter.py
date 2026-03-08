import sys
from sqlmodel import Session, select
from database import engine
from models.user import User

# Just test call_llm directly
from services.llm_engine import call_llm
from services.llm_engine import call_llm_with_history

try:
    print("Testing call_llm...")
    res = call_llm("test prompt", model_index=0, retries=1)
    print("Result:")
    print(res[:200])
except Exception as e:
    import traceback
    print("Failed call_llm:")
    traceback.print_exc()

try:
    print("\nTesting call_llm_with_history...")
    res = call_llm_with_history("system prompt", [{"role":"user", "content":"hi"}], "test prompt", model_index=0)
    print("Result:")
    print(res[:200])
except Exception as e:
    import traceback
    print("Failed call_llm_with_history:")
    traceback.print_exc()
