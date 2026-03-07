from __future__ import annotations

from typing import Any, Dict, List, Optional

from faq_loader import FAQItem, load_faq_items
from retriever import Candidate, Retriever, normalize_text

_retriever: Optional[Retriever] = None

STAGES = ["입점문의", "입점진행", "매장운영"]

STAGE_KEYWORDS = {
    "입점문의": [
        "입점",
        "제안",
        "가능",
        "팝업스토어",
        "문의",
        "브랜드",
    ],
    "입점진행": [
        "계약",
        "출입",
        "pms",
        "하역",
        "주차",
        "설치",
        "철수",
        "광고",
        "did",
        "내선",
    ],
    "매장운영": [
        "운영",
        "pos",
        "포스",
        "쇼핑백",
        "정산",
        "세금계산서",
        "고장",
        "매출",
        "민원",
        "고객",
    ],
}


def setup_agent(csv_path: str) -> None:
    global _retriever
    items = load_faq_items(csv_path)
    _retriever = Retriever(items)


def classify_stage(question: str) -> str:
    q = normalize_text(question)
    stage_scores = {s: 0 for s in STAGES}
    for stage, keywords in STAGE_KEYWORDS.items():
        for kw in keywords:
            if kw in q:
                stage_scores[stage] += 1
    # default to 입점문의 if no strong signal
    best = max(stage_scores, key=stage_scores.get)
    return best if stage_scores[best] > 0 else "입점문의"


def retrieve_candidates(question: str, stage: str) -> List[Candidate]:
    if _retriever is None:
        raise RuntimeError("Agent is not initialized. Call setup_agent() first.")
    primary = _retriever.search(question, stage=stage, top_k=5)
    # If stage-locked retrieval is too weak, perform a global search as a fallback.
    if not primary or (primary and primary[0].score < 0.24):
        global_hits = _retriever.search(question, stage=None, top_k=5)
        merged = {}
        for cand in primary + global_hits:
            key = cand.item.faq_id
            if key not in merged or cand.score > merged[key].score:
                merged[key] = cand
        return sorted(merged.values(), key=lambda c: c.score, reverse=True)[:5]
    return primary


def _confidence_note(conf: str) -> str:
    if conf == "확정 정책형 답변":
        return "현재 문서/시스템 기준의 확정 정책 안내입니다."
    if conf == "운영 사례형 답변":
        return "운영 사례 기반 안내이며 현장별로 일부 달라질 수 있습니다."
    if conf == "확인 필요형 답변":
        return "최종 확정 전 담당 바이어 확인이 필요한 항목입니다."
    return "필요 시 담당 바이어 확인을 권장합니다."


def compose_answer(question: str, candidates: List[Candidate]) -> Dict[str, Any]:
    if not candidates:
        return fallback_answer(question)

    top = candidates[0]
    item: FAQItem = top.item
    q_norm = normalize_text(question)

    # Safety rule for high-frequency entry questions lacking direct FAQ rows
    if ("입점" in q_norm and any(k in q_norm for k in ["문의", "진행"])) or (
        "팝업스토어" in q_norm and ("가능" in q_norm or "가능한" in q_norm)
    ):
        return {
            "found": True,
            "matched_question": "입점문의(규칙 기반 안내)",
            "score": round(top.score, 4),
            "stage": "입점문의",
            "core_answer": (
                "입점 문의는 담당 바이어 채널로 접수 후 내부 검토, 조건 협의, 계약 순으로 진행됩니다. "
                "팝업스토어도 운영 기준에 따라 검토 가능합니다."
            ),
            "next_action": "브랜드 소개자료와 진행 희망 일정(기간/카테고리)을 정리해 담당 바이어에게 전달해 주세요.",
            "contact_channel": "담당 바이어",
            "confidence_type": "확인 필요형 답변",
            "confidence_note": "입점 가능 여부/조건은 최종적으로 담당 바이어 확인이 필요합니다.",
            "restrictions": "입점 조건은 카테고리 및 일정에 따라 달라질 수 있음",
        }

    # uncertain retrieval guard
    if top.score < 0.20:
        return fallback_answer(question)

    return {
        "found": True,
        "matched_question": item.question,
        "score": round(top.score, 4),
        "stage": item.stage,
        "core_answer": item.answer,
        "next_action": item.next_action or "담당 바이어와 확인 후 다음 절차를 진행해 주세요.",
        "contact_channel": item.contact_channel or "",
        "confidence_type": item.confidence_type or "확인 필요형 답변",
        "confidence_note": _confidence_note(item.confidence_type),
        "restrictions": item.restrictions or "",
    }


def fallback_answer(question: str) -> Dict[str, Any]:
    stage = classify_stage(question)
    return {
        "found": False,
        "matched_question": "",
        "score": 0.0,
        "stage": stage,
        "core_answer": (
            "현재 등록된 FAQ에서 정확히 일치하는 답변을 찾지 못했습니다. "
            "질문을 조금 더 구체적으로 입력해 주시거나 담당 바이어 확인이 필요합니다."
        ),
        "next_action": "질문에 대상(입점/출입/POS/정산)과 상황(일정/장소)을 함께 적어 다시 문의해 주세요.",
        "contact_channel": "담당 바이어",
        "confidence_type": "확인 필요형 답변",
        "confidence_note": "정확한 정책 확인을 위해 담당 바이어 최종 확인이 필요합니다.",
        "restrictions": "",
    }
