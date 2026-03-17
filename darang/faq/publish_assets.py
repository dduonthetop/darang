from __future__ import annotations

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent.parent

PUBLISH_FILE_MAPPINGS = [
    (BASE_DIR / "ipark_faq_brand.html", REPO_ROOT / "ipark_faq_brand.html"),
    (BASE_DIR / "ipark_faq_admin.html", REPO_ROOT / "ipark_faq_admin.html"),
    (BASE_DIR / "static" / "local_faq_data.js", REPO_ROOT / "static" / "local_faq_data.js"),
    (BASE_DIR / "static" / "site_config.js", REPO_ROOT / "static" / "site_config.js"),
    (BASE_DIR / "static" / "category_defaults.js", REPO_ROOT / "static" / "category_defaults.js"),
    (BASE_DIR / "static" / "employee_auth.js", REPO_ROOT / "static" / "employee_auth.js"),
]

PUBLISH_TARGETS = [target for _, target in PUBLISH_FILE_MAPPINGS]

STATIC_DATA_TARGETS = [
    BASE_DIR / "static" / "local_faq_data.js",
    REPO_ROOT / "static" / "local_faq_data.js",
]

GITHUB_SYNC_PATHS = [
    *STATIC_DATA_TARGETS,
    BASE_DIR / "ipark_faq_dataset.csv",
    BASE_DIR / "faq_admin_meta.json",
]
