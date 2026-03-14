from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi import Request
from fastapi import status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from starlette.middleware.sessions import SessionMiddleware

from .admin_store import load_admin_dataset, load_admin_meta, save_admin_dataset, save_admin_meta
from .agent import (
    STAGES,
    classify_stage,
    compose_answer,
    fallback_answer,
    retrieve_candidates,
    setup_agent,
)
from .employee_directory import EmployeeDirectoryError, load_employee_directory

BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "ipark_faq_dataset.csv"
SESSION_SECRET = os.getenv("ADMIN_SESSION_SECRET", "ipark-faq-admin-secret-change-me")

app = FastAPI(title="iPark FAQ Chatbot Demo")

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
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.on_event("startup")
def startup_event() -> None:
    setup_agent(str(CSV_PATH))


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=300)
    stage_hint: Optional[str] = None


class AdminDatasetRequest(BaseModel):
    items: list[dict]


class LoginRequest(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=50)


def _load_employees():
    return load_employee_directory()


def _employee_source_status() -> str:
    try:
        employees = _load_employees()
        meta = load_admin_meta()
        if meta.get("employee_source_status") != "ok":
            meta["employee_source_status"] = "ok"
            save_admin_meta(meta)
        return f"ok:{len(employees)}"
    except EmployeeDirectoryError as exc:
        meta = load_admin_meta()
        meta["employee_source_status"] = str(exc)
        save_admin_meta(meta)
        return str(exc)


def _current_admin(request: Request) -> dict:
    admin = request.session.get("admin_user")
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin login required.")
    return admin


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/admin/login", response_class=HTMLResponse)
def admin_login_page(request: Request):
    if request.session.get("admin_user"):
        return RedirectResponse(url="/admin", status_code=status.HTTP_302_FOUND)
    return templates.TemplateResponse(
        "admin_login.html",
        {
            "request": request,
            "employee_source_status": _employee_source_status(),
        },
    )


@app.get("/brand-demo")
def brand_demo():
    return FileResponse(str(BASE_DIR / "ipark_faq_brand.html"))


@app.get("/admin", response_class=HTMLResponse)
def admin_home(request: Request):
    if not request.session.get("admin_user"):
        return RedirectResponse(url="/admin/login", status_code=status.HTTP_302_FOUND)
    return templates.TemplateResponse("admin.html", {"request": request})


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


@app.get("/admin/api/faqs")
def admin_faqs(request: Request):
    _current_admin(request)
    items = load_admin_dataset(CSV_PATH)
    return {
        "items": items,
        "count": len(items),
        "csv_path": str(CSV_PATH),
        "meta": load_admin_meta(),
    }


@app.put("/admin/api/faqs")
def admin_save_faqs(req: AdminDatasetRequest, request: Request):
    admin = _current_admin(request)
    if not req.items:
        raise HTTPException(status_code=400, detail="At least one FAQ item is required.")

    result = save_admin_dataset(CSV_PATH, req.items, editor=admin)
    setup_agent(str(CSV_PATH))
    return result


@app.get("/admin/api/session")
def admin_session(request: Request):
    admin = _current_admin(request)
    return {
        "user": admin,
        "meta": load_admin_meta(),
        "employee_source_status": _employee_source_status(),
    }


@app.post("/admin/api/login")
def admin_login(req: LoginRequest, request: Request):
    try:
        employees = _load_employees()
    except EmployeeDirectoryError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    employee = employees.get(req.employee_id.strip())
    if not employee or req.password.strip() != req.employee_id.strip():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid employee id or password.")

    admin_user = {
        "employee_id": employee.employee_id,
        "name": employee.name,
    }
    request.session["admin_user"] = admin_user
    return {"ok": True, "user": admin_user}


@app.post("/admin/api/logout")
def admin_logout(request: Request):
    request.session.clear()
    return {"ok": True}


@app.get("/admin/api/public-faqs")
def public_faqs():
    public_items = []
    for item in load_admin_dataset(CSV_PATH):
        public_items.append(
            {
                key: value
                for key, value in item.items()
                if key not in {"last_editor_id", "last_editor_name", "last_edited_at"}
            }
        )
    return {
        "items": public_items,
        "meta": {
            "revision": load_admin_meta().get("revision", 0),
        },
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
