from __future__ import annotations

import shutil
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
SOURCE_ROOT = REPO_ROOT / "darang" / "faq"

FILE_MAPPINGS = [
    (SOURCE_ROOT / "ipark_faq_brand.html", REPO_ROOT / "ipark_faq_brand.html"),
    (SOURCE_ROOT / "ipark_faq_admin.html", REPO_ROOT / "ipark_faq_admin.html"),
    (SOURCE_ROOT / "static" / "local_faq_data.js", REPO_ROOT / "static" / "local_faq_data.js"),
    (SOURCE_ROOT / "static" / "site_config.js", REPO_ROOT / "static" / "site_config.js"),
    (SOURCE_ROOT / "static" / "employee_auth.js", REPO_ROOT / "static" / "employee_auth.js"),
]


def sync_file(source: Path, target: Path) -> None:
    if not source.exists():
        raise FileNotFoundError(f"Missing source file: {source}")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def main() -> None:
    for source, target in FILE_MAPPINGS:
        sync_file(source, target)
        print(f"synced: {source.relative_to(REPO_ROOT)} -> {target.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
