const chatWindow = document.getElementById("chatWindow");
const questionInput = document.getElementById("questionInput");
const sendBtn = document.getElementById("sendBtn");
const stageButtons = document.querySelectorAll(".stage-btn");
const exampleButtons = document.querySelectorAll(".example-btn");
const loadingTemplate = document.getElementById("loadingTemplate");

let selectedStage = "입점문의";

function addBubble(text, role = "bot") {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return div;
}

function addAnswerCard(payload) {
  const wrap = document.createElement("div");
  wrap.className = "bubble bot";

  const card = document.createElement("div");
  card.className = "answer-card";

  const rows = [
    ["단계", payload.stage || "-"],
    ["핵심 안내", payload.core_answer || "답변을 찾지 못했습니다."],
    ["다음 액션", payload.next_action || "-"],
  ];

  if (payload.contact_channel) {
    rows.push(["문의 채널", payload.contact_channel]);
  }
  if (payload.confidence_type) {
    rows.push(["신뢰 유형", payload.confidence_type]);
  }
  if (payload.confidence_note) {
    rows.push(["참고", payload.confidence_note]);
  }

  rows.forEach(([k, v]) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<div class="k">${k}</div><div class="v">${v}</div>`;
    card.appendChild(row);
  });

  wrap.appendChild(card);
  chatWindow.appendChild(wrap);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setStage(stage) {
  selectedStage = stage;
  stageButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.stage === stage);
  });
}

async function askQuestion(text) {
  const question = text.trim();
  if (!question) return;

  addBubble(question, "user");
  questionInput.value = "";

  const loadingEl = loadingTemplate.content.firstElementChild.cloneNode(true);
  chatWindow.appendChild(loadingEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        stage_hint: selectedStage,
      }),
    });

    const data = await res.json();
    loadingEl.remove();
    addAnswerCard(data);
  } catch (err) {
    loadingEl.remove();
    addBubble("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", "bot");
  }
}

sendBtn.addEventListener("click", () => askQuestion(questionInput.value));
questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    askQuestion(questionInput.value);
  }
});

stageButtons.forEach((btn) => {
  btn.addEventListener("click", () => setStage(btn.dataset.stage));
});

exampleButtons.forEach((btn) => {
  btn.addEventListener("click", () => askQuestion(btn.textContent));
});

addBubble("안녕하세요. 아이파크몰 브랜드 FAQ 챗봇 데모입니다. 질문을 입력해 주세요.", "bot");

