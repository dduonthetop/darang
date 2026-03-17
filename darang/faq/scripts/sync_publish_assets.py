from __future__ import annotations

import shutil
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from darang.faq.publish_assets import PUBLISH_FILE_MAPPINGS  # noqa: E402


def sync_file(source: Path, target: Path) -> None:
    if not source.exists():
        raise FileNotFoundError(f"Missing source file: {source}")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def main() -> None:
    for source, target in PUBLISH_FILE_MAPPINGS:
        sync_file(source, target)
        print(f"synced: {source.relative_to(REPO_ROOT)} -> {target.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
