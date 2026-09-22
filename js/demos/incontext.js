/* ============================================================
   데모 6-A — 자료를 붙이고 물어보기 (맥락 내 학습)
   붙여 넣은 자료는 토큰이 되어 맥락 창에 놓이고, 질문의 단어가
   자료의 단어에 주목(어텐션)해 답을 만든다. 가중치 변화는 없다.
   주목 분포는 실제 모델의 패턴을 본떠 손으로 설계한 예시.
   ============================================================ */
(function () {
  "use strict";
  const docEl = document.getElementById("iclDoc");
  const picker = document.getElementById("iclPicker");
  const answerEl = document.getElementById("iclAnswer");
  const explainEl = document.getElementById("iclExplain");
  if (!docEl || !picker) return;

  // 자료: 문장별 토큰(어절)
  const DOC = [
    ["연차는", "입사", "첫해에", "11일,", "이듬해부터", "15일이", "주어진다."],
    ["쓰지", "않은", "연차는", "다음", "해", "3월", "말까지", "이월할", "수", "있다."],
    ["반차는", "하루", "두", "번까지", "나눠", "쓸", "수", "있으며,", "전날", "오후", "6시", "전에", "신청해야", "한다."],
    ["경조사", "휴가는", "연차와", "별도로", "최대", "5일이다."],
  ];

  // 질문별: 자료 토큰 위치("문장.어절") → 주목 강도(0~1), 답, 설명
  const QUESTIONS = [
    {
      q: "입사 2년째인데 연차가 며칠이야?",
      attn: { "0.0": 0.55, "0.4": 1.0, "0.5": 1.0, "0.2": 0.35, "0.3": 0.3 },
      answer: "이듬해부터 15일이 주어지므로, 입사 2년째에는 연차가 15일입니다.",
      copied: ["이듬해부터", "15일"],
      explain: "'2년째'에 해당하는 규정은 '이듬해부터 15일'입니다. 답에 필요한 근거라 밝게 표시했습니다. 이 강조는 설명용이며 실제 어텐션 측정값은 아닙니다.",
    },
    {
      q: "남은 연차 내년에 써도 돼?",
      attn: { "1.0": 0.5, "1.1": 0.5, "1.2": 0.45, "1.3": 0.8, "1.4": 0.8, "1.5": 1.0, "1.6": 1.0, "1.7": 1.0 },
      answer: "네, 쓰지 않은 연차는 다음 해 3월 말까지 이월할 수 있습니다.",
      copied: ["다음 해 3월 말까지", "이월할 수 있"],
      explain: "이월할 수 있다는 말만으로는 부족합니다. '다음 해 3월 말까지'라는 조건도 답에 있어야 합니다. 자료를 줄 때는 이런 조건이 답에서 빠지지 않았는지 확인해 보세요.",
    },
    {
      q: "반차 신청은 언제까지 해야 해?",
      attn: { "2.0": 0.6, "2.8": 1.0, "2.9": 1.0, "2.10": 1.0, "2.11": 0.9, "2.12": 0.9 },
      answer: "반차는 전날 오후 6시 전에 신청해야 합니다.",
      copied: ["전날 오후 6시 전에", "신청해야"],
      explain: "질문은 반차의 횟수가 아니라 신청 마감 시간에 관한 것입니다. 셋째 문장에서 '전날 오후 6시 전에'라는 부분이 답의 근거가 됩니다.",
    },
    {
      q: "육아휴직은 몇 달이야?",
      attn: { "3.1": 0.35, "3.0": 0.2, "0.0": 0.15, "1.2": 0.15 },
      answer: "육아휴직은 최대 1년까지 사용할 수 있습니다.",
      copied: [],
      missing: true,
      explain: "이 규정에는 육아휴직 기간이 없습니다. 위 답은 근거 없이 숫자를 채워 넣는 오류를 보여 주려고 만든 예시이지, 실제 규정이나 법률 안내가 아닙니다. 이 자료만으로는 '확인할 수 없습니다'라고 답해야 합니다.",
    },
  ];

  // --- 자료 렌더 ---
  const tokEls = {};
  DOC.forEach((sent, si) => {
    const p = document.createElement("p");
    p.className = "icl-sent";
    sent.forEach((w, wi) => {
      const span = document.createElement("span");
      span.className = "icl-tok";
      span.textContent = w;
      p.appendChild(span);
      p.appendChild(document.createTextNode(" "));
      tokEls[`${si}.${wi}`] = span;
    });
    docEl.appendChild(p);
  });

  // --- 질문 칩 ---
  const chips = QUESTIONS.map((item, i) => {
    const b = document.createElement("button");
    b.className = "qkv-chip"; b.textContent = item.q;
    b.addEventListener("click", () => select(i));
    picker.appendChild(b);
    return b;
  });

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function select(i) {
    const item = QUESTIONS[i];
    chips.forEach((c, k) => c.classList.toggle("sel", k === i));

    // 주목 밝기
    Object.entries(tokEls).forEach(([key, el]) => {
      const a = item.attn[key] || 0;
      el.style.setProperty("--a", a.toFixed(2));
      el.classList.toggle("hot", a >= 0.75);
      el.classList.toggle("warm", a > 0 && a < 0.75);
    });

    // 답: 자료에서 옮겨 온 구간 강조
    let html = escapeHtml(item.answer);
    item.copied.forEach((frag) => {
      html = html.replace(escapeHtml(frag), `<mark>${escapeHtml(frag)}</mark>`);
    });
    answerEl.innerHTML =
      `<span class="icl-answer-tag">${item.missing ? "모델의 답 · 자료에 근거 없음" : "모델의 답 · 밑줄은 자료에서 옮겨 온 표현"}</span>` +
      `<div class="icl-answer-body${item.missing ? " missing" : ""}">${html}</div>`;
    explainEl.textContent = item.explain;
  }

  select(0);
})();
