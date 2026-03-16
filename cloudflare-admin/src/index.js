import { SEED_EMPLOYEES, SEED_FAQS } from "./seed-data.js";

const ALLOWED_ORIGINS = new Set([
  "https://dduonthetop.github.io",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
]);

const RAW_MANUAL_BASE = "https://raw.githubusercontent.com/dduonthetop/darang/main/darang/faq/references/manual/";
const DEFAULT_EXAMPLES_BY_CATEGORY = {
  "8.1": ["매장 운영시간이 어떻게 되나요?", "연장 영업 기준이 있나요?"],
  "8.2": ["출입 신청은 어떤 시스템으로 접수하나요?", "야간 작업 인원 등록은 어떻게 하나요?"],
  "8.3": ["브랜드 지원 주차 기준은 어떻게 되나요?", "하역장 진입 차량 제한이 있나요?"],
  "8.4": ["택배 수령은 어디서 가능한가요?", "임시 보관 공간도 제공되나요?"],
  "8.5": ["추가 전력 사용은 어떻게 신청하나요?", "공사 가능 시간은 언제인가요?"],
  "8.6": ["고객 컴플레인은 어디로 접수하나요?", "매장 운영 중 민원은 어떻게 접수하나요?"],
  "8.7": ["쇼핑백은 어디서 받나요?", "쇼핑백 수령 위치가 어디인가요?"],
  "8.12": ["POS는 기본 제공되나요?", "POS 장애 발생 시 어디로 연락하나요?"],
  "8.13": ["내선전화 신청은 어떻게 하나요?", "내선전화 설치 리드타임은 얼마나 걸리나요?"],
  "8.8": ["필수 이수 교육이 있나요?", "모바일 출입증 발급도 가능한가요?"],
  "8.9": ["정산은 언제 입금되나요?", "세금계산서는 어떻게 처리되나요?"],
  "8.10": ["DID 송출은 어떻게 요청하나요?", "몰 광고물은 언제까지 요청해야 하나요?"],
  "8.11": ["영업 철수는 언제 가능한가요?", "계약 연장은 언제 협의하나요?"],
};

const DEFAULT_CATEGORY_LABELS = {
  "8.1": "기본 운영",
  "8.2": "출입 신청 및 인원 등록",
  "8.3": "차량/주차/하역/동선",
  "8.4": "반입/반출 및 보관",
  "8.5": "매장 시설 및 공사",
  "8.6": "매장 운영 및 서비스",
  "8.7": "비품/쇼핑백",
  "8.12": "POS",
  "8.13": "내선전화",
  "8.8": "인력 운영 및 교육",
  "8.9": "정산 및 행정",
  "8.10": "마케팅/사인물/콘텐츠",
  "8.11": "철수/연장/계약 종료",
};

const CATEGORY_LABEL_ALIASES = {
  "유선전화": "내선전화",
  "정산 및 세정": "정산 및 행정",
  "철수/퇴장/계약 종료": "철수/연장/계약 종료",
};

function normalizeCategoryLabels(payload) {
  const next = { ...DEFAULT_CATEGORY_LABELS };
  if (!payload || typeof payload !== "object") return next;
  for (const [categoryCode, value] of Object.entries(payload)) {
    const trimmed = String(value || "").trim();
    if (!trimmed) continue;
    next[categoryCode] = CATEGORY_LABEL_ALIASES[trimmed] || trimmed;
  }
  return next;
}

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
    next.category = "8.13 내선전화";
    next.manual_files = PHONE_MANUALS;
    next.keywords = ["8.13", "내선전화", ...keywords.filter((k) => !["8.7", "유선전화", "내선전화", "비품/쇼핑백/내선전화/POS"].includes(k))];
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
        examples_json TEXT NOT NULL DEFAULT '{}',
        category_labels_json TEXT NOT NULL DEFAULT '{}',
        revision INTEGER NOT NULL DEFAULT 0,
        last_editor_id TEXT NOT NULL DEFAULT '',
        last_editor_name TEXT NOT NULL DEFAULT '',
        last_edited_at TEXT NOT NULL DEFAULT ''
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS feedback_reports (
        id TEXT PRIMARY KEY,
        complaint_text TEXT NOT NULL,
        conversation_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `),
  ]);

  try {
    await env.DB.prepare("ALTER TABLE faq_state ADD COLUMN examples_json TEXT NOT NULL DEFAULT '{}'").run();
  } catch (error) {
    // column already exists
  }
  try {
    await env.DB.prepare("ALTER TABLE faq_state ADD COLUMN category_labels_json TEXT NOT NULL DEFAULT '{}'").run();
  } catch (error) {
    // column already exists
  }

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
      "INSERT INTO faq_state (id, faqs_json, examples_json, category_labels_json, revision, last_editor_id, last_editor_name, last_edited_at) VALUES (1, ?, ?, ?, 0, '', '', '')",
    )
      .bind(JSON.stringify(SEED_FAQS), JSON.stringify(DEFAULT_EXAMPLES_BY_CATEGORY), JSON.stringify(DEFAULT_CATEGORY_LABELS))
      .run();
  }
}

async function getFaqState(env) {
  const row = await env.DB.prepare(
    "SELECT faqs_json, examples_json, category_labels_json, revision, last_editor_id, last_editor_name, last_edited_at FROM faq_state WHERE id = 1",
  ).first();
  const items = normalizeFaqItems(JSON.parse(row?.faqs_json || "[]"));
  const examples = {
    ...DEFAULT_EXAMPLES_BY_CATEGORY,
    ...(JSON.parse(row?.examples_json || "{}")),
  };
  const category_labels = normalizeCategoryLabels(JSON.parse(row?.category_labels_json || "{}"));
  return {
    items,
    examples,
    category_labels,
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

async function getFeedbackReports(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, complaint_text, conversation_json, created_at FROM feedback_reports ORDER BY created_at DESC",
  ).all();
  return (results || []).map((row) => ({
    id: row.id,
    complaint_text: row.complaint_text,
    conversation: JSON.parse(row.conversation_json || "[]"),
    created_at: row.created_at,
  }));
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
            examples: state.examples,
            category_labels: state.category_labels,
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
        const current = await getFaqState(env);
        const examples = body.examples && typeof body.examples === "object"
          ? { ...DEFAULT_EXAMPLES_BY_CATEGORY, ...body.examples }
          : current.examples;
        const categoryLabels = body.category_labels && typeof body.category_labels === "object"
          ? normalizeCategoryLabels(body.category_labels)
          : normalizeCategoryLabels(current.category_labels);
        const now = new Date().toISOString();
        const nextRevision = current.meta.revision + 1;

        await env.DB.prepare(
          "UPDATE faq_state SET faqs_json = ?, examples_json = ?, category_labels_json = ?, revision = ?, last_editor_id = ?, last_editor_name = ?, last_edited_at = ? WHERE id = 1",
        )
          .bind(JSON.stringify(items), JSON.stringify(examples), JSON.stringify(categoryLabels), nextRevision, admin.employee_id, admin.name, now)
          .run();

        return withCors(
          request,
          json({
            ok: true,
            items,
            examples,
            category_labels: categoryLabels,
            meta: {
              revision: nextRevision,
              last_editor_id: admin.employee_id,
              last_editor_name: admin.name,
              last_edited_at: now,
            },
          }),
        );
      }

      if (request.method === "PUT" && url.pathname === "/api/admin/examples") {
        const admin = await requireAuth(request, env);
        const body = await request.json();
        const current = await getFaqState(env);
        const examples = body.examples && typeof body.examples === "object"
          ? { ...DEFAULT_EXAMPLES_BY_CATEGORY, ...body.examples }
          : current.examples;
        const now = new Date().toISOString();
        const nextRevision = current.meta.revision + 1;

        await env.DB.prepare(
          "UPDATE faq_state SET examples_json = ?, revision = ?, last_editor_id = ?, last_editor_name = ?, last_edited_at = ? WHERE id = 1",
        )
          .bind(JSON.stringify(examples), nextRevision, admin.employee_id, admin.name, now)
          .run();

        return withCors(
          request,
          json({
            ok: true,
            examples,
            category_labels: current.category_labels,
            meta: {
              revision: nextRevision,
              last_editor_id: admin.employee_id,
              last_editor_name: admin.name,
              last_edited_at: now,
            },
          }),
        );
      }

      if (request.method === "PUT" && url.pathname === "/api/admin/category-labels") {
        const admin = await requireAuth(request, env);
        const body = await request.json();
        const current = await getFaqState(env);
        const categoryLabels = body.category_labels && typeof body.category_labels === "object"
          ? normalizeCategoryLabels(body.category_labels)
          : normalizeCategoryLabels(current.category_labels);
        const now = new Date().toISOString();
        const nextRevision = current.meta.revision + 1;

        await env.DB.prepare(
          "UPDATE faq_state SET category_labels_json = ?, revision = ?, last_editor_id = ?, last_editor_name = ?, last_edited_at = ? WHERE id = 1",
        )
          .bind(JSON.stringify(categoryLabels), nextRevision, admin.employee_id, admin.name, now)
          .run();

        return withCors(
          request,
          json({
            ok: true,
            category_labels: categoryLabels,
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
        return withCors(request, json({ user: admin, meta: state.meta, category_labels: state.category_labels }));
      }

      if (request.method === "POST" && url.pathname === "/api/feedback") {
        const body = await request.json();
        const complaintText = String(body.complaint_text || "").trim();
        const conversation = Array.isArray(body.conversation) ? body.conversation : [];
        if (!complaintText) {
          return withCors(request, json({ detail: "Complaint text is required" }, { status: 400 }));
        }
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        await env.DB.prepare(
          "INSERT INTO feedback_reports (id, complaint_text, conversation_json, created_at) VALUES (?, ?, ?, ?)",
        )
          .bind(id, complaintText, JSON.stringify(conversation), createdAt)
          .run();
        return withCors(request, json({ ok: true, id, created_at: createdAt }));
      }

      if (request.method === "GET" && url.pathname === "/api/admin/feedback") {
        await requireAuth(request, env);
        const items = await getFeedbackReports(env);
        return withCors(request, json({ items }));
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
