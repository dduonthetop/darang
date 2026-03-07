from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request
from pydantic import BaseModel, Field

from agent import (
    STAGES,
    classify_stage,
    compose_answer,
    fallback_answer,
    retrieve_candidates,
    setup_agent,
)

BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "ipark_faq_dataset.csv"

app = FastAPI(title="iPark FAQ Chatbot Demo")

# CORS (for remote/static-hosted frontends)
# Example:
#   CORS_ALLOW_ORIGINS=*
#   CORS_ALLOW_ORIGINS=http://127.0.0.1:5500,http://192.168.0.10:8080
_raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "*").strip()
if _raw_origins == "*" or not _raw_origins:
    allow_origins = ["*"]
else:
    allow_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.on_event("startup")
def startup_event() -> None:
    setup_agent(str(CSV_PATH))


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=300)
    stage_hint: Optional[str] = None


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/brand-demo")
def brand_demo():
    return FileResponse(str(BASE_DIR / "ipark_faq_brand.html"))


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ipark-faq-chatbot-demo",
        "csv_exists": CSV_PATH.exists(),
    }


@app.get("/config")
def config():
    return {
        "stages": STAGES,
        "cors_allow_origins": allow_origins,
        "csv_path": str(CSV_PATH),
    }


@app.post("/chat")
def chat(req: ChatRequest):
    question = req.question.strip()
    if not question:
        return fallback_answer("")

    stage = req.stage_hint if req.stage_hint in STAGES else classify_stage(question)
    candidates = retrieve_candidates(question, stage)
    payload = compose_answer(question, candidates)
    payload["input_stage"] = stage
    return payload
