from __future__ import annotations

import difflib
import re
from dataclasses import dataclass
from typing import Iterable, List

from faq_loader import FAQItem


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^0-9a-z가-힣\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str) -> List[str]:
    norm = normalize_text(text)
    return [t for t in norm.split(" ") if t]


def char_ngrams(text: str, n: int = 2) -> List[str]:
    norm = normalize_text(text).replace(" ", "")
    if len(norm) < n:
        return [norm] if norm else []
    return [norm[i : i + n] for i in range(len(norm) - n + 1)]


def overlap_score(a: Iterable[str], b: Iterable[str]) -> float:
    sa = set(a)
    sb = set(b)
    if not sa or not sb:
        return 0.0
    inter = len(sa & sb)
    union = len(sa | sb)
    return inter / union


@dataclass
class Candidate:
    item: FAQItem
    score: float


class Retriever:
    def __init__(self, items: List[FAQItem]) -> None:
        self.items = items

    def _score_item(self, query: str, item: FAQItem, stage: str | None) -> float:
        q_norm = normalize_text(query)
        full_text = " ".join(
            [item.question, " ".join(item.paraphrases), " ".join(item.keywords), item.category, item.stage]
        )
        f_norm = normalize_text(full_text)

        # 1) exact/similar string score
        ratio = difflib.SequenceMatcher(None, q_norm, f_norm).ratio()
        q_ratio = difflib.SequenceMatcher(None, q_norm, normalize_text(item.question)).ratio()
        best_para = 0.0
        for p in item.paraphrases:
            best_para = max(best_para, difflib.SequenceMatcher(None, q_norm, normalize_text(p)).ratio())
        sim_score = max(ratio * 0.5, q_ratio * 0.9, best_para)

        # 2) token overlap
        token_score = overlap_score(tokenize(query), tokenize(full_text))

        # 3) char n-gram overlap for Korean fuzziness
        ngram_score = overlap_score(char_ngrams(query), char_ngrams(full_text))

        # 4) keyword bonus
        keyword_bonus = 0.0
        q_tokens = set(tokenize(query))
        if item.keywords:
            hit = len(q_tokens & set(map(normalize_text, item.keywords)))
            keyword_bonus = min(0.15, hit * 0.03)

        # 4-1) domain anchor bonus/penalty to reduce generic mismatch
        anchor = 0.0
        item_q = normalize_text(item.question)
        if ("pos" in q_norm or "포스" in q_norm):
            if "pos" in item_q or "포스" in item_q:
                anchor += 0.18
            else:
                anchor -= 0.06
        if "쇼핑백" in q_norm:
            if "쇼핑백" in item_q:
                anchor += 0.18
            else:
                anchor -= 0.06
        if "입점" in q_norm:
            if "입점" in item_q or "팝업" in item_q:
                anchor += 0.12

        # 5) stage bonus/penalty
        stage_bonus = 0.0
        if stage:
            stage_bonus = 0.18 if item.stage == stage else -0.06

        score = (sim_score * 0.55) + (token_score * 0.25) + (ngram_score * 0.20) + keyword_bonus + anchor + stage_bonus
        return max(0.0, min(1.0, score))

    def search(self, query: str, stage: str | None = None, top_k: int = 5) -> List[Candidate]:
        scored: List[Candidate] = []
        for item in self.items:
            score = self._score_item(query, item, stage)
            if score >= 0.16:
                scored.append(Candidate(item=item, score=score))
        scored.sort(key=lambda c: c.score, reverse=True)
        return scored[:top_k]
