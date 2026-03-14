from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from .faq_loader import FAQItem, load_faq_items
from .github_sync import auto_sync_github

BASE_DIR = Path(__file__).resolve().parent
CSV_HEADERS = [
    "faq_id",
    "stage",
    "audience",
    "category",
    "question",
    "paraphrases",
    "answer",
    "next_action",
    "contact_channel",
    "restrictions",
    "visibility",
    "confidence_type",
    "updated_at",
    "source",
    "keywords",
    "manual_files",
    "last_editor_id",
    "last_editor_name",
    "last_edited_at",
]
STATIC_DATA_TARGETS = [
    BASE_DIR / "static" / "local_faq_data.js",
    BASE_DIR.parent.parent / "static" / "local_faq_data.js",
]
ADMIN_META_PATH = BASE_DIR / "faq_admin_meta.json"


def _join_values(values: List[str]) -> str:
    return "; ".join(v.strip() for v in values if (v or "").strip())


def _normalize_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        normalized = value.replace("\r\n", "\n")
        parts: List[str] = []
        for chunk in normalized.split("\n"):
            parts.extend(piece.strip() for piece in chunk.split(";"))
        return [p for p in parts if p]
    return []


def serialize_faq_item(item: FAQItem) -> Dict[str, Any]:
    return {
        "faq_id": item.faq_id,
        "stage": item.stage,
        "audience": item.audience,
        "category": item.category,
        "question": item.question,
        "paraphrases": list(item.paraphrases),
        "answer": item.answer,
        "next_action": item.next_action,
        "contact_channel": item.contact_channel,
        "restrictions": item.restrictions,
        "visibility": item.visibility,
        "confidence_type": item.confidence_type,
        "updated_at": item.updated_at,
        "source": item.source,
        "keywords": list(item.keywords),
        "manual_files": list(item.manual_files),
        "last_editor_id": item.last_editor_id,
        "last_editor_name": item.last_editor_name,
        "last_edited_at": item.last_edited_at,
    }


def load_admin_dataset(csv_path: str | Path) -> List[Dict[str, Any]]:
    return [serialize_faq_item(item) for item in load_faq_items(csv_path)]


def _row_from_payload(item: Dict[str, Any]) -> Dict[str, str]:
    return {
        "faq_id": str(item.get("faq_id", "")).strip(),
        "stage": str(item.get("stage", "")).strip(),
        "audience": str(item.get("audience", "")).strip(),
        "category": str(item.get("category", "")).strip(),
        "question": str(item.get("question", "")).strip(),
        "paraphrases": _join_values(_normalize_list(item.get("paraphrases", []))),
        "answer": str(item.get("answer", "")).strip(),
        "next_action": str(item.get("next_action", "")).strip(),
        "contact_channel": str(item.get("contact_channel", "")).strip(),
        "restrictions": str(item.get("restrictions", "")).strip(),
        "visibility": str(item.get("visibility", "")).strip(),
        "confidence_type": str(item.get("confidence_type", "")).strip(),
        "updated_at": str(item.get("updated_at", "")).strip(),
        "source": str(item.get("source", "")).strip(),
        "keywords": _join_values(_normalize_list(item.get("keywords", []))),
        "manual_files": _join_values(_normalize_list(item.get("manual_files", []))),
        "last_editor_id": str(item.get("last_editor_id", "")).strip(),
        "last_editor_name": str(item.get("last_editor_name", "")).strip(),
        "last_edited_at": str(item.get("last_edited_at", "")).strip(),
    }


def _to_static_record(item: FAQItem) -> Dict[str, Any]:
    record: Dict[str, Any] = {
        "faq_id": item.faq_id,
        "stage": item.stage,
        "question": item.question,
        "paraphrases": list(item.paraphrases),
        "answer": item.answer,
        "next_action": item.next_action,
        "contact_channel": item.contact_channel,
        "confidence_type": item.confidence_type,
        "category": item.category,
    }
    if item.keywords:
        record["keywords"] = list(item.keywords)
    if item.manual_files:
        record["manual_files"] = list(item.manual_files)
    return record


def _comparison_payload(item: Dict[str, Any]) -> Dict[str, Any]:
    keys = [
        "faq_id",
        "stage",
        "audience",
        "category",
        "question",
        "paraphrases",
        "answer",
        "next_action",
        "contact_channel",
        "restrictions",
        "visibility",
        "confidence_type",
        "updated_at",
        "source",
        "keywords",
        "manual_files",
    ]
    payload: Dict[str, Any] = {}
    for key in keys:
        value = item.get(key, "")
        payload[key] = _normalize_list(value) if isinstance(value, list) or key in {"paraphrases", "keywords", "manual_files"} else str(value).strip()
    return payload


def load_admin_meta() -> Dict[str, Any]:
    if not ADMIN_META_PATH.exists():
        return {
            "revision": 0,
            "last_editor_id": "",
            "last_editor_name": "",
            "last_edited_at": "",
            "employee_source_status": "",
            "github_sync_status": "",
            "github_sync_message": "",
            "github_synced_at": "",
        }
    return json.loads(ADMIN_META_PATH.read_text(encoding="utf-8"))


def save_admin_meta(meta: Dict[str, Any]) -> Dict[str, Any]:
    ADMIN_META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return meta


def _write_static_data(items: List[FAQItem]) -> None:
    payload = [_to_static_record(item) for item in items]
    js_body = "window.LOCAL_FAQ_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
    for target in STATIC_DATA_TARGETS:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(js_body, encoding="utf-8")


def save_admin_dataset(csv_path: str | Path, items: List[Dict[str, Any]], editor: Dict[str, str]) -> Dict[str, Any]:
    path = Path(csv_path)
    previous_items = {item["faq_id"]: item for item in load_admin_dataset(path)}
    now = datetime.now().isoformat(timespec="seconds")
    prepared_items: List[Dict[str, Any]] = []

    for item in items:
        current = dict(item)
        faq_id = str(current.get("faq_id", "")).strip()
        previous = previous_items.get(faq_id, {})
        if _comparison_payload(previous) != _comparison_payload(current):
            current["last_editor_id"] = editor.get("employee_id", "")
            current["last_editor_name"] = editor.get("name", "")
            current["last_edited_at"] = now
        else:
            current["last_editor_id"] = current.get("last_editor_id", previous.get("last_editor_id", ""))
            current["last_editor_name"] = current.get("last_editor_name", previous.get("last_editor_name", ""))
            current["last_edited_at"] = current.get("last_edited_at", previous.get("last_edited_at", ""))
        prepared_items.append(current)

    rows = [_row_from_payload(item) for item in prepared_items]

    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_HEADERS)
        writer.writeheader()
        writer.writerows(rows)

    loaded_items = load_faq_items(path)
    _write_static_data(loaded_items)
    previous_meta = load_admin_meta()
    meta = save_admin_meta(
        {
            "revision": int(previous_meta.get("revision", 0)) + 1,
            "last_editor_id": editor.get("employee_id", ""),
            "last_editor_name": editor.get("name", ""),
            "last_edited_at": now,
            "employee_source_status": previous_meta.get("employee_source_status", ""),
            "github_sync_status": previous_meta.get("github_sync_status", ""),
            "github_sync_message": previous_meta.get("github_sync_message", ""),
            "github_synced_at": previous_meta.get("github_synced_at", ""),
        }
    )
    github_sync = auto_sync_github(editor)
    meta.update(
        {
            "github_sync_status": github_sync.get("status", ""),
            "github_sync_message": github_sync.get("message", ""),
            "github_synced_at": now if github_sync.get("status") in {"pushed", "noop"} else previous_meta.get("github_synced_at", ""),
        }
    )
    save_admin_meta(meta)

    return {
        "saved": True,
        "count": len(loaded_items),
        "csv_path": str(path),
        "static_targets": [str(target) for target in STATIC_DATA_TARGETS],
        "meta": meta,
        "github_sync": github_sync,
    }
