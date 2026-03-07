from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import List


@dataclass
class FAQItem:
    faq_id: str
    stage: str
    audience: str
    category: str
    question: str
    paraphrases: List[str]
    answer: str
    next_action: str
    contact_channel: str
    restrictions: str
    visibility: str
    confidence_type: str
    updated_at: str
    source: str
    keywords: List[str]


def _split_paraphrases(value: str) -> List[str]:
    if not value:
        return []
    parts = [p.strip() for p in value.split(";")]
    return [p for p in parts if p]


def _derive_keywords(question: str, category: str) -> List[str]:
    seed = (
        question.replace("?", " ")
        .replace(",", " ")
        .replace("/", " ")
        .replace("(", " ")
        .replace(")", " ")
    )
    tokens = [t.strip() for t in seed.split() if len(t.strip()) >= 2]
    cat_tokens = [t.strip() for t in category.split() if len(t.strip()) >= 2]
    # Preserve insertion order while deduplicating
    merged = []
    seen = set()
    for t in cat_tokens + tokens:
        if t not in seen:
            seen.add(t)
            merged.append(t)
    return merged[:20]


def load_faq_items(csv_path: str | Path) -> List[FAQItem]:
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {path}")

    items: List[FAQItem] = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            question = (row.get("question") or "").strip()
            category = (row.get("category") or "").strip()
            item = FAQItem(
                faq_id=(row.get("faq_id") or "").strip(),
                stage=(row.get("stage") or "").strip(),
                audience=(row.get("audience") or "공통").strip(),
                category=category,
                question=question,
                paraphrases=_split_paraphrases(row.get("paraphrases") or ""),
                answer=(row.get("answer") or "").strip(),
                next_action=(row.get("next_action") or "").strip(),
                contact_channel=(row.get("contact_channel") or "").strip(),
                restrictions=(row.get("restrictions") or "").strip(),
                visibility=(row.get("visibility") or "").strip(),
                confidence_type=(row.get("confidence_type") or "").strip(),
                updated_at=(row.get("updated_at") or "").strip(),
                source=(row.get("source") or "").strip(),
                keywords=_derive_keywords(question, category),
            )
            items.append(item)
    return items

