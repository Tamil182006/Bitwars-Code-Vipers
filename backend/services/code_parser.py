import os
import stat
import shutil
import git  # type: ignore  (package is gitpython, installed via requirements.txt)
from pathlib import Path
from typing import List


def remove_readonly(func, path, _):
    """
    Error handler for shutil.rmtree on Windows.
    Git sets some files as read-only. This removes that attribute before deleting.
    """
    os.chmod(path, stat.S_IWRITE)
    func(path)

# Only these file types will be picked up from the repo
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx",
    ".java", ".cpp", ".c", ".go", ".rs",
    ".rb", ".php", ".cs", ".html", ".css",
    ".json", ".yaml", ".yml", ".md"
}

# These folders will be completely skipped
IGNORED_DIRS = {
    ".git", "node_modules", "__pycache__",
    ".venv", "venv", "dist", "build",
    ".next", "coverage", ".idea", ".vscode"
}


def clone_repo(repo_url: str, target_dir: str) -> str:
    """
    Clones a GitHub repository into target_dir.
    If the folder already exists, it deletes it first and clones fresh.
    Uses remove_readonly handler to handle Windows read-only .git files.
    """
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir, onerror=remove_readonly)
    git.Repo.clone_from(repo_url, target_dir)
    return target_dir


def extract_code_files(repo_dir: str) -> List[dict]:
    """
    Walks through the cloned repo folder.
    Picks only supported code files and skips ignored folders.
    Returns a list of dicts with file path and content.
    """
    code_files = []

    for root, dirs, files in os.walk(repo_dir):
        # Remove ignored directories so os.walk doesn't go into them
        ignored = [d for d in dirs if d in IGNORED_DIRS]
        for d in ignored:
            dirs.remove(d)

        for file in files:
            ext = Path(file).suffix
            if ext in SUPPORTED_EXTENSIONS:
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()

                    # Skip completely empty files
                    if not content.strip():
                        continue

                    relative_path = os.path.relpath(filepath, repo_dir)
                    code_files.append({
                        "path": relative_path,
                        "content": content,
                        "extension": ext
                    })
                except Exception:
                    pass  # Skip any file that can't be read

    return code_files


def chunk_code(file_data: dict, chunk_size: int = 60, overlap: int = 10) -> List[dict]:
    """
    Splits a single file's content into overlapping chunks of lines.
    chunk_size = how many lines per chunk (default 60)
    overlap    = how many lines to repeat between chunks (default 10)
                 so we don't lose context at chunk boundaries
    """
    lines = file_data["content"].split("\n")
    chunks = []
    chunk_id = 0
    i = 0

    while i < len(lines):
        chunk_lines = lines[i : i + chunk_size]
        chunk_text = "\n".join(chunk_lines)

        if chunk_text.strip():  # Skip empty chunks
            chunks.append({
                "chunk_id": f"{file_data['path']}::chunk_{chunk_id}",
                "path": file_data["path"],
                "content": chunk_text,
                "start_line": i + 1,
                "end_line": i + len(chunk_lines)
            })

        i += chunk_size - overlap
        chunk_id += 1

    return chunks
