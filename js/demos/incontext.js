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
      explain: "질문의 '2년째'가 자료의 '이듬해부터'에, '연차가 며칠'이 '15일이'에 주목했습니다. 답의 '15일'을 쓸 차례에 어텐션이 그 자리로 몰리고, 자료의 표현이 거의 그대로 답에 옮겨 옵니다.",
    },
    {
      q: "남은 연차 내년에 써도 돼?",
      attn: { "1.0": 0.5, "1.1": 0.5, "1.2": 0.45, "1.3": 0.8, "1.4": 0.8, "1.5": 1.0, "1.6": 1.0, "1.7": 1.0 },
      answer: "네, 쓰지 않은 연차는 다음 해 3월 말까지 이월할 수 있습니다.",
      copied: ["다음 해 3월 말까지", "이월할 수 있"],
      explain: "'남은 연차'는 '쓰지 않은 연차는'에, '내년에 써도'는 '이월할'에 맞았습니다. 조건인 '3월 말까지'도 함께 주목받아 답에 들어갑니다. 이 조건을 빼먹으면 틀린 답이 되는데, 어텐션이 그 단어들에도 닿아 있어 살아남습니다.",
    },
    {
      q: "반차 신청은 언제까지 해야 해?",
      attn: { "2.0": 0.6, "2.8": 1.0, "2.9": 1.0, "2.10": 1.0, "2.11": 0.9, "2.12": 0.9 },
      answer: "반차는 전날 오후 6시 전에 신청해야 합니다.",
      copied: ["전날 오후 6시 전에", "신청해야"],
      explain: "'반차'가 셋째 문장의 '반차는'을 찾고, '언제까지'가 시간 표현 '전날 오후 6시 전에'에 주목했습니다. 같은 문장 앞부분의 '하루 두 번까지'는 질문과 맞지 않아 주목을 거의 받지 못합니다.",
    },
    {
      q: "육아휴직은 몇 달이야?",
      attn: { "3.1": 0.35, "3.0": 0.2, "0.0": 0.15, "1.2": 0.15 },
      answer: "육아휴직은 최대 1년까지 사용할 수 있습니다.",
      copied: [],
      missing: true,
      explain: "자료에 '육아휴직'이 없습니다. '휴가는'에 약하게 주목했지만 맞는 이름표가 없으니 어텐션이 흩어집니다. 이때 모델은 사전학습에서 익힌 일반 상식(법정 육아휴직 1년)으로 그럴듯하게 채웠습니다. 이 회사의 규정인지는 알 수 없는데도 말투는 똑같이 자신 있습니다. \"자료에 없으면 없다고 답하라\"는 지시를 함께 넣으면 대개 '자료에 해당 내용이 없습니다'로 바뀝니다.",
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
