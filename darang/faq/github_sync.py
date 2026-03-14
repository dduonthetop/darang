from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Dict, List


BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent.parent
SYNC_PATHS = [
    REPO_ROOT / "static" / "local_faq_data.js",
    BASE_DIR / "static" / "local_faq_data.js",
    BASE_DIR / "ipark_faq_dataset.csv",
    BASE_DIR / "faq_admin_meta.json",
]


def _run_git(args: List[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )


def auto_sync_github(editor: Dict[str, str]) -> Dict[str, str]:
    enabled = os.getenv("GITHUB_AUTO_SYNC", "1").strip().lower()
    if enabled in {"0", "false", "off", "no"}:
        return {"status": "disabled", "message": "GitHub auto sync is disabled."}

    for key, value in {"user.name": "IPARK", "user.email": "ipark@local"}.items():
        current = _run_git(["config", "--get", key])
        if current.returncode != 0 or not current.stdout.strip():
            _run_git(["config", key, value])

    add_args = ["add", *[str(path.relative_to(REPO_ROOT)).replace("\\", "/") for path in SYNC_PATHS if path.exists()]]
    add_result = _run_git(add_args)
    if add_result.returncode != 0:
        return {"status": "error", "message": add_result.stderr.strip() or add_result.stdout.strip() or "git add failed"}

    diff_result = _run_git(["diff", "--cached", "--quiet"])
    if diff_result.returncode == 0:
        return {"status": "noop", "message": "No GitHub sync changes detected."}

    editor_id = editor.get("employee_id", "")
    commit_message = f"faq-sync: update by {editor_id}" if editor_id else "faq-sync: update"
    commit_result = _run_git(["commit", "-m", commit_message])
    if commit_result.returncode != 0:
        return {"status": "error", "message": commit_result.stderr.strip() or commit_result.stdout.strip() or "git commit failed"}

    push_result = _run_git(["push", "origin", "main"])
    if push_result.returncode != 0:
        return {"status": "error", "message": push_result.stderr.strip() or push_result.stdout.strip() or "git push failed"}

    return {"status": "pushed", "message": "GitHub sync completed."}
