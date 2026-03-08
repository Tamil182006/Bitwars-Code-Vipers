import re
from typing import List


def parse_stack_trace(error_text: str) -> dict:
    """
    Reads a raw error message or stack trace and extracts key information.
    Works for Python, JavaScript, Java, and generic error formats.

    Returns a dict with:
      - raw           : the original error text
      - error_type    : e.g. "KeyError", "TypeError"
      - error_message : e.g. "'user_id'"
      - files_mentioned  : list of file paths found in the trace
      - functions_mentioned : list of function/method names found
      - line_numbers  : list of line numbers mentioned
      - search_query  : a clean combined query to use in vector search
    """

    result = {
        "raw": error_text,
        "error_type": None,
        "error_message": None,
        "files_mentioned": [],
        "functions_mentioned": [],
        "line_numbers": [],
        "search_query": error_text[:500],  # fallback: just use raw text
    }

    # ------------------------------------------------------------------
    # 1. Detect Python-style error type and message
    #    Example: "KeyError: 'user_id'"  or  "ValueError: invalid literal"
    # ------------------------------------------------------------------
    python_error = re.search(
        r"([A-Z][a-zA-Z]*(?:Error|Exception|Warning|Fault)):\s*(.+)",
        error_text
    )
    if python_error:
        result["error_type"] = python_error.group(1).strip()
        result["error_message"] = python_error.group(2).strip()

    # ------------------------------------------------------------------
    # 2. Detect Python-style file + line references
    #    Example: File "src/database.py", line 42, in connect
    # ------------------------------------------------------------------
    python_frames = re.findall(
        r'File ["\'](.+?)["\'],\s*line\s*(\d+)(?:,\s*in\s+(\w+))?',
        error_text
    )
    for match in python_frames:
        filepath, line_no, func_name = match
        if filepath not in result["files_mentioned"]:
            result["files_mentioned"].append(filepath)
        result["line_numbers"].append(int(line_no))
        if func_name and func_name not in result["functions_mentioned"]:
            result["functions_mentioned"].append(func_name)

    # ------------------------------------------------------------------
    # 3. Detect JavaScript / Node.js style frames
    #    Example: at getUserById (src/users.js:34:12)
    #             at processTicksAndRejections (internal/process/task_queues.js:95:5)
    # ------------------------------------------------------------------
    js_frames = re.findall(
        r'at\s+([^\s(]+)\s+\((.+?):(\d+):\d+\)',
        error_text
    )
    for func_name, filepath, line_no in js_frames:
        # Skip Node.js internal frames
        if "internal/" in filepath or "node_modules" in filepath:
            continue
        if func_name not in result["functions_mentioned"]:
            result["functions_mentioned"].append(func_name)
        if filepath not in result["files_mentioned"]:
            result["files_mentioned"].append(filepath)
        result["line_numbers"].append(int(line_no))

    # Also catch JS errors without file reference:
    # Example: at functionName (<anonymous>:10:5)
    js_anon = re.findall(r'at\s+([^\s(]+)\s+\(<anonymous>:\d+:\d+\)', error_text)
    for func_name in js_anon:
        if func_name not in result["functions_mentioned"]:
            result["functions_mentioned"].append(func_name)

    # ------------------------------------------------------------------
    # 4. Detect Java-style stack frames
    #    Example: at com.example.app.UserService.getUser(UserService.java:56)
    # ------------------------------------------------------------------
    java_frames = re.findall(
        r'at\s+([\w.]+)\.([\w<>]+)\((\w+\.java):(\d+)\)',
        error_text
    )
    for package, method, filename, line_no in java_frames:
        if method not in result["functions_mentioned"]:
            result["functions_mentioned"].append(method)
        if filename not in result["files_mentioned"]:
            result["files_mentioned"].append(filename)
        result["line_numbers"].append(int(line_no))

    # ------------------------------------------------------------------
    # 5. Generic: pick up any file paths with common code extensions
    #    Catches anything the above patterns may have missed
    # ------------------------------------------------------------------
    generic_files = re.findall(
        r'[\w./\\-]+\.(?:py|js|ts|java|cpp|c|go|rb|php|cs|jsx|tsx)',
        error_text
    )
    for f in generic_files:
        if f not in result["files_mentioned"]:
            result["files_mentioned"].append(f)

    # ------------------------------------------------------------------
    # 6. Build a smart search query from everything we extracted
    #    This is what gets sent to the vector store for semantic search
    # ------------------------------------------------------------------
    query_parts = []

    if result["error_type"]:
        query_parts.append(result["error_type"])
    if result["error_message"]:
        query_parts.append(result["error_message"])

    # Add top 2 files and top 2 functions to the query
    query_parts.extend(result["files_mentioned"][:2])
    query_parts.extend(result["functions_mentioned"][:2])

    if query_parts:
        result["search_query"] = " ".join(query_parts)

    return result
