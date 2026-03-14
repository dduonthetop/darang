const state = {
  items: [],
  filteredIndexes: [],
  selectedIndex: -1,
  dirty: false,
};

const fieldIds = [
  "faq_id",
  "stage",
  "audience",
  "category",
  "question",
  "answer",
  "next_action",
  "contact_channel",
  "restrictions",
  "visibility",
  "confidence_type",
  "updated_at",
  "source",
];

const listFieldIds = ["paraphrases", "keywords", "manual_files"];

const faqList = document.getElementById("faqList");
const searchInput = document.getElementById("searchInput");
const saveBtn = document.getElementById("saveBtn");
const reloadBtn = document.getElementById("reloadBtn");
const newBtn = document.getElementById("newBtn");
const deleteBtn = document.getElementById("deleteBtn");
const logoutBtn = document.getElementById("logoutBtn");
const countBadge = document.getElementById("countBadge");
const dirtyBadge = document.getElementById("dirtyBadge");
const editorTitle = document.getElementById("editorTitle");
const sessionInfo = document.getElementById("sessionInfo");
const revisionInfo = document.getElementById("revisionInfo");
const githubSyncInfo = document.getElementById("githubSyncInfo");
const itemAudit = document.getElementById("itemAudit");

function normalize(text) {
  return (text || "").toLowerCase().trim();
}

function splitLines(value) {
  return (value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function markDirty(flag = true) {
  state.dirty = flag;
  dirtyBadge.textContent = flag ? "저장 필요" : "저장됨";
  dirtyBadge.classList.toggle("is-dirty", flag);
}

function selectedItem() {
  return state.items[state.selectedIndex] || null;
}

function emptyItem() {
  const now = new Date().toISOString().slice(0, 10);
  return {
    faq_id: `FAQ-${String(state.items.length + 1).padStart(3, "0")}`,
    stage: "입점문의",
    audience: "공통",
    category: "",
    question: "",
    paraphrases: [],
    answer: "",
    next_action: "",
    contact_channel: "",
    restrictions: "",
    visibility: "공통공개",
    confidence_type: "운영 사례형 답변",
    updated_at: now,
    source: "",
    keywords: [],
    manual_files: [],
  };
}

function escapeHtml(raw) {
  return (raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderList() {
  const keyword = normalize(searchInput.value);
  state.filteredIndexes = state.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (!keyword) return true;
      const haystack = [
        item.faq_id,
        item.category,
        item.question,
        item.answer,
        ...(item.keywords || []),
      ].join(" ");
      return normalize(haystack).includes(keyword);
    })
    .map(({ index }) => index);

  faqList.innerHTML = "";
  state.filteredIndexes.forEach((index) => {
    const item = state.items[index];
    const button = document.createElement("button");
    button.className = "faq-item";
    button.type = "button";
    if (index === state.selectedIndex) button.classList.add("active");
    button.innerHTML = `
      <div class="faq-item-id">${escapeHtml(item.faq_id || "새 FAQ")}</div>
      <p class="faq-item-title">${escapeHtml(item.question || "질문을 입력해 주세요")}</p>
      <p class="faq-item-meta">${escapeHtml(item.category || "카테고리 없음")} · ${escapeHtml(item.stage || "-")}</p>
    `;
    button.addEventListener("click", () => {
      state.selectedIndex = index;
      renderList();
      renderEditor();
    });
    faqList.appendChild(button);
  });

  countBadge.textContent = `${state.items.length}건`;
}

function renderEditor() {
  const item = selectedItem();
  deleteBtn.disabled = !item;

  if (!item) {
    editorTitle.textContent = "FAQ를 선택해 주세요";
    itemAudit.textContent = "";
    [...fieldIds, ...listFieldIds].forEach((id) => {
      document.getElementById(id).value = "";
    });
    return;
  }

  editorTitle.textContent = item.question || item.faq_id || "새 FAQ";
  itemAudit.textContent = item.last_editor_id
    ? `마지막 수정: ${item.last_editor_name} (${item.last_editor_id}) · ${item.last_edited_at || "-"}`
    : "아직 수정 기록이 없습니다.";
  fieldIds.forEach((id) => {
    document.getElementById(id).value = item[id] || "";
  });
  listFieldIds.forEach((id) => {
    document.getElementById(id).value = (item[id] || []).join("\n");
  });
}

function bindInputs() {
  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", () => {
      const item = selectedItem();
      if (!item) return;
      item[id] = el.value;
      if (id === "question") editorTitle.textContent = el.value || item.faq_id || "새 FAQ";
      markDirty(true);
      renderList();
    });
  });

  listFieldIds.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", () => {
      const item = selectedItem();
      if (!item) return;
      item[id] = splitLines(el.value);
      markDirty(true);
      renderList();
    });
  });
}

async function loadDataset() {
  const response = await fetch("/admin/api/faqs");
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    throw new Error("FAQ 목록을 불러오지 못했습니다.");
  }
  const data = await response.json();
  state.items = data.items || [];
  state.selectedIndex = state.items.length ? 0 : -1;
  renderMeta(data.meta || {});
  markDirty(false);
  renderList();
  renderEditor();
}

async function saveDataset() {
  saveBtn.disabled = true;
  saveBtn.textContent = "저장 중...";
  try {
    const response = await fetch("/admin/api/faqs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: state.items }),
    });
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "저장에 실패했습니다.");
    }
    const data = await response.json();
    renderMeta(data.meta || {});
    await loadDataset();
    markDirty(false);
    handleGithubSync(data.github_sync);
  } catch (error) {
    window.alert(error.message || "저장에 실패했습니다.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "전체 저장";
  }
}

function handleGithubSync(syncInfo) {
  if (!syncInfo) return;
  if (syncInfo.status === "pushed") {
    window.alert("저장 후 GitHub 사이트까지 동기화되었습니다.");
    return;
  }
  if (syncInfo.status === "noop") {
    return;
  }
  if (syncInfo.status === "disabled") {
    window.alert("저장은 완료되었지만 GitHub 자동 동기화는 비활성화되어 있습니다.");
    return;
  }
  if (syncInfo.status === "error") {
    window.alert(`저장은 완료되었지만 GitHub 동기화에 실패했습니다.\n${syncInfo.message || ""}`);
  }
}

function renderMeta(meta) {
  if (!meta) return;
  revisionInfo.textContent = meta.last_editor_id
    ? `최근 반영: ${meta.last_editor_name} (${meta.last_editor_id}) · ${meta.last_edited_at || "-"} · revision ${meta.revision || 0}`
    : `최근 반영 이력 없음 · revision ${meta.revision || 0}`;
  githubSyncInfo.textContent = meta.github_sync_status
    ? `GitHub 동기화: ${meta.github_sync_status} · ${meta.github_synced_at || "-"}${meta.github_sync_message ? ` · ${meta.github_sync_message}` : ""}`
    : "GitHub 동기화 이력 없음";
}

async function loadSession() {
  const response = await fetch("/admin/api/session");
  if (!response.ok) {
    window.location.href = "/admin/login";
    return;
  }
  const data = await response.json();
  const user = data.user || {};
  sessionInfo.textContent = `로그인 사용자: ${user.name || "-"} (${user.employee_id || "-"})`;
  renderMeta(data.meta || {});
}

searchInput.addEventListener("input", renderList);

reloadBtn.addEventListener("click", async () => {
  if (state.dirty && !window.confirm("저장하지 않은 변경사항이 사라집니다. 다시 불러올까요?")) {
    return;
  }
  try {
    await loadDataset();
  } catch (error) {
    window.alert(error.message || "다시 불러오기에 실패했습니다.");
  }
});

saveBtn.addEventListener("click", saveDataset);

logoutBtn.addEventListener("click", async () => {
  await fetch("/admin/api/logout", { method: "POST" });
  window.location.href = "/admin/login";
});

newBtn.addEventListener("click", () => {
  state.items.unshift(emptyItem());
  state.selectedIndex = 0;
  markDirty(true);
  renderList();
  renderEditor();
  document.getElementById("question").focus();
});

deleteBtn.addEventListener("click", () => {
  if (state.selectedIndex < 0) return;
  const item = selectedItem();
  if (!window.confirm(`${item.faq_id || "선택한 FAQ"} 항목을 삭제할까요?`)) {
    return;
  }
  state.items.splice(state.selectedIndex, 1);
  state.selectedIndex = state.items.length ? 0 : -1;
  markDirty(true);
  renderList();
  renderEditor();
});

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

bindInputs();
Promise.all([loadSession(), loadDataset()]).catch((error) => {
  window.alert(error.message || "초기 데이터를 불러오지 못했습니다.");
});
