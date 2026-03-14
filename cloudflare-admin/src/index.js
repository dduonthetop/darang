import { SEED_EMPLOYEES, SEED_FAQS } from "./seed-data.js";

const ALLOWED_ORIGINS = new Set([
  "https://dduonthetop.github.io",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
]);

const RAW_MANUAL_BASE = "https://raw.githubusercontent.com/dduonthetop/darang/main/darang/faq/references/manual/";

function manualUrl(filename) {
  return RAW_MANUAL_BASE + encodeURIComponent(filename);
}

const POS_MANUALS = [
  {
    type: "file",
    label: "아이파크몰 용산점 리빙·패션·팝업 POS 매뉴얼",
    url: manualUrl("아이파크몰 용산점 리빙,패션,팝업-POS 매뉴얼.pdf"),
  },
  {
    type: "file",
    label: "아이파크몰 용산점 FnB POS 매뉴얼",
    url: manualUrl("아이파크몰 용산점 FnB-POS 매뉴얼_협력사원 교육용.pdf"),
  },
];

const PHONE_MANUALS = [
  {
    type: "file",
    label: "내선 전화 신청 방법",
    url: manualUrl("내선 전화 신청 방법.pdf"),
  },
];

function normalizeFaqItem(item) {
  const next = {
    ...item,
    manual_files: Array.isArray(item?.manual_files) ? item.manual_files : [],
  };
  const question = String(next.question || "");
  const keywords = Array.isArray(next.keywords) ? next.keywords : [];

  if (question === "POS 연동 또는 매출 보고 방식은 무엇인가요?") {
    next.category = "8.12 POS";
    next.manual_files = POS_MANUALS;
    next.keywords = ["8.12", "POS", ...keywords.filter((k) => !["8.6", "8.7", "POS", "비품/쇼핑백/내선전화/POS"].includes(k))];
  } else if (question === "POS 사용 방법 안내 채널(매뉴얼/교육/현장 지원)과 문의처는?") {
    next.category = "8.12 POS";
    next.manual_files = POS_MANUALS;
    next.keywords = ["8.12", "POS", ...keywords.filter((k) => !["8.7", "POS", "비품/쇼핑백/내선전화/POS"].includes(k))];
  } else if (question === "POS 장애 발생 시 즉시 대응 연락처와 처리 SLA는?") {
    next.category = "8.12 POS";
    next.manual_files = POS_MANUALS;
    next.keywords = ["8.12", "POS", ...keywords.filter((k) => !["8.7", "POS", "비품/쇼핑백/내선전화/POS"].includes(k))];
  } else if (question === "내선전화 신청 절차, 설치 리드타임, 비용 부담 기준은?") {
    next.category = "8.13 유선전화";
    next.manual_files = PHONE_MANUALS;
    next.keywords = ["8.13", "유선전화", ...keywords.filter((k) => !["8.7", "내선전화", "비품/쇼핑백/내선전화/POS"].includes(k))];
  }

  return next;
}

function normalizeFaqItems(items) {
  return (Array.isArray(items) ? items : []).map(normalizeFaqItem);
}

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = new Headers();
  if (ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  return headers;
}

function withCors(request, response) {
  const headers = corsHeaders(request);
  response.headers.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function ensureSchema(env) {
  await env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS employees (
        employee_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS faq_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        faqs_json TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0,
        last_editor_id TEXT NOT NULL DEFAULT '',
        last_editor_name TEXT NOT NULL DEFAULT '',
        last_edited_at TEXT NOT NULL DEFAULT ''
      )
    `),
  ]);

  const employeeCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM employees").first();
  if (!employeeCount?.count) {
    const inserts = SEED_EMPLOYEES.map((item) =>
      env.DB.prepare("INSERT INTO employees (employee_id, display_name) VALUES (?, ?)").bind(
        item.employee_id,
        item.display_name,
      ),
    );
    await env.DB.batch(inserts);
  }

  const state = await env.DB.prepare("SELECT id FROM faq_state WHERE id = 1").first();
  if (!state) {
    await env.DB.prepare(
      "INSERT INTO faq_state (id, faqs_json, revision, last_editor_id, last_editor_name, last_edited_at) VALUES (1, ?, 0, '', '', '')",
    )
      .bind(JSON.stringify(SEED_FAQS))
      .run();
  }
}

async function getFaqState(env) {
  const row = await env.DB.prepare(
    "SELECT faqs_json, revision, last_editor_id, last_editor_name, last_edited_at FROM faq_state WHERE id = 1",
  ).first();
  const items = normalizeFaqItems(JSON.parse(row?.faqs_json || "[]"));
  return {
    items,
    meta: {
      revision: Number(row?.revision || 0),
      last_editor_id: row?.last_editor_id || "",
      last_editor_name: row?.last_editor_name || "",
      last_edited_at: row?.last_edited_at || "",
    },
  };
}

async function requireAuth(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    throw new Response(JSON.stringify({ detail: "Unauthorized" }), { status: 401 });
  }

  const session = await env.DB.prepare(
    "SELECT s.employee_id, e.display_name FROM sessions s JOIN employees e ON e.employee_id = s.employee_id WHERE s.token = ?",
  )
    .bind(token)
    .first();
  if (!session) {
    throw new Response(JSON.stringify({ detail: "Unauthorized" }), { status: 401 });
  }
  return {
    employee_id: session.employee_id,
    name: session.display_name,
    token,
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return withCors(request, new Response(null, { status: 204 }));
    }

    await ensureSchema(env);
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/public-faqs") {
        const state = await getFaqState(env);
        return withCors(
          request,
          json({
            items: state.items,
            meta: { revision: state.meta.revision },
          }),
        );
      }

      if (request.method === "POST" && url.pathname === "/api/login") {
        const body = await request.json();
        const employeeId = String(body.employee_id || "").trim();
        const password = String(body.password || "").trim();
        const employee = await env.DB.prepare(
          "SELECT employee_id, display_name FROM employees WHERE employee_id = ?",
        )
          .bind(employeeId)
          .first();

        if (!employee || employeeId !== password) {
          return withCors(request, json({ detail: "관리자에게 문의하세요." }, { status: 401 }));
        }

        const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
        await env.DB.prepare(
          "INSERT INTO sessions (token, employee_id, created_at) VALUES (?, ?, ?)",
        )
          .bind(token, employee.employee_id, new Date().toISOString())
          .run();

        return withCors(
          request,
          json({
            ok: true,
            token,
            user: {
              employee_id: employee.employee_id,
              name: employee.display_name,
            },
          }),
        );
      }

      if (request.method === "POST" && url.pathname === "/api/logout") {
        const admin = await requireAuth(request, env);
        await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(admin.token).run();
        return withCors(request, json({ ok: true }));
      }

      if (request.method === "GET" && url.pathname === "/api/admin/faqs") {
        const admin = await requireAuth(request, env);
        const state = await getFaqState(env);
        return withCors(request, json({ ...state, user: admin }));
      }

      if (request.method === "PUT" && url.pathname === "/api/admin/faqs") {
        const admin = await requireAuth(request, env);
        const body = await request.json();
        const items = normalizeFaqItems(Array.isArray(body.items) ? body.items : []);
        const now = new Date().toISOString();
        const current = await getFaqState(env);
        const nextRevision = current.meta.revision + 1;

        await env.DB.prepare(
          "UPDATE faq_state SET faqs_json = ?, revision = ?, last_editor_id = ?, last_editor_name = ?, last_edited_at = ? WHERE id = 1",
        )
          .bind(JSON.stringify(items), nextRevision, admin.employee_id, admin.name, now)
          .run();

        return withCors(
          request,
          json({
            ok: true,
            items,
            meta: {
              revision: nextRevision,
              last_editor_id: admin.employee_id,
              last_editor_name: admin.name,
              last_edited_at: now,
            },
          }),
        );
      }

      if (request.method === "GET" && url.pathname === "/api/session") {
        const admin = await requireAuth(request, env);
        const state = await getFaqState(env);
        return withCors(request, json({ user: admin, meta: state.meta }));
      }

      return withCors(request, json({ detail: "Not found" }, { status: 404 }));
    } catch (error) {
      if (error instanceof Response) {
        return withCors(request, error);
      }
      return withCors(
        request,
        json(
          {
            detail: error instanceof Error ? error.message : "Internal server error",
          },
          { status: 500 },
        ),
      );
    }
  },
};
